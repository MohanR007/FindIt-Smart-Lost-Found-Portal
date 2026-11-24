"""
FindIt – Smart Lost & Found Portal
AWS Lambda Backend: FindIt-Backend
Runtime: Python 3.12 / 3.13
Region: ap-southeast-2 (Sydney)

Handles:
- GET  /health (Public health check)
- GET  /users/me (Authenticated user profile from Cognito JWT & FindIt-Users)
- GET  /items (Public/authenticated items catalog with scan pagination, filtering & S3 pre-signed view URLs)
- POST /items (Authenticated item reporting with verified JWT sub, imageKey validation & DynamoDB FindIt-Items)
- POST /uploads/presign (Authenticated pre-signed S3 PUT URL generation for item images)
- GET  /claims (Authenticated claims list with caller scoping, role filters & admin review queue)
- GET  /claims/{claimId} (Authenticated claim retrieval with privacy shielding for verificationDetails)
- POST /claims (Authenticated claim creation with atomic active claim check & TransactWriteItems)
- POST /claims/{claimId}/finder-decision (Transactional finder approval or rejection with mandatory rationale)
- POST /claims/{claimId}/dispute (Transactional claimant dispute appeal to campus administration)
- POST /claims/{claimId}/admin-decision (Transactional admin approval or rejection with item release)
- POST /claims/{claimId}/handover (Claimant & finder dual handover with concurrency retry & TransactWriteItems)
"""

import json
import uuid
import os
import re
from datetime import datetime, timezone
from decimal import Decimal
import boto3
from botocore.config import Config

# -------------------------------------------------------------------------
# AWS Configuration, DynamoDB Tables & Clients
# -------------------------------------------------------------------------
AWS_REGION = os.environ.get('AWS_REGION', 'ap-southeast-2')
ITEMS_TABLE_NAME = os.environ.get('ITEMS_TABLE', 'FindIt-Items')
USERS_TABLE_NAME = os.environ.get('USERS_TABLE', 'FindIt-Users')
CLAIMS_TABLE_NAME = os.environ.get('CLAIMS_TABLE', 'FindIt-Claims')
ACTIVITY_LOG_TABLE_NAME = os.environ.get('ACTIVITY_LOG_TABLE', 'FindIt-ActivityLog')
S3_BUCKET_NAME = os.environ.get('S3_BUCKET', 'findit-item-images-2026-7777')

dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
dynamodb_client = boto3.client('dynamodb', region_name=AWS_REGION)

items_table = dynamodb.Table(ITEMS_TABLE_NAME)
users_table = dynamodb.Table(USERS_TABLE_NAME)
claims_table = dynamodb.Table(CLAIMS_TABLE_NAME)
activity_log_table = dynamodb.Table(ACTIVITY_LOG_TABLE_NAME)

# S3 client with SigV4 configuration for ap-southeast-2
s3_client = boto3.client(
    's3',
    region_name=AWS_REGION,
    config=Config(signature_version='s3v4')
)

ALLOWED_IMAGE_TYPES = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp'
}

CLAIM_STATUSES = {
    'PENDING_FINDER_REVIEW': 'PENDING_FINDER_REVIEW',
    'FINDER_APPROVED': 'FINDER_APPROVED',
    'PENDING_ADMIN_REVIEW': 'PENDING_ADMIN_REVIEW',
    'FINDER_REJECTED': 'FINDER_REJECTED',
    'ADMIN_REVIEW_REQUESTED': 'ADMIN_REVIEW_REQUESTED',
    'ADMIN_APPROVED': 'ADMIN_APPROVED',
    'ADMIN_REJECTED': 'ADMIN_REJECTED',
    'HANDOVER_IN_PROGRESS': 'HANDOVER_IN_PROGRESS',
    'COMPLETED': 'COMPLETED',
}

# -------------------------------------------------------------------------
# Serialization, DynamoDB & Request Helpers
# -------------------------------------------------------------------------
class DecimalEncoder(json.JSONEncoder):
    """Encodes DynamoDB Decimal values to int or float for JSON responses."""
    def default(self, obj):
        if isinstance(obj, Decimal):
            if obj % 1 == 0:
                return int(obj)
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

def build_response(status_code, body, extra_headers=None):
    """Constructs standardized API responses without CORS headers (managed by API Gateway)."""
    headers = {
        'Content-Type': 'application/json',
    }
    if extra_headers:
        headers.update(extra_headers)

    return {
        'statusCode': status_code,
        'headers': headers,
        'body': json.dumps(body, cls=DecimalEncoder) if not isinstance(body, str) else body,
    }

def extract_request_info(event):
    """Normalizes HTTP method and path from HTTP API v2 and REST payloads."""
    method = ''
    if 'requestContext' in event and 'http' in event['requestContext']:
        method = event['requestContext']['http'].get('method', '').upper()
    elif 'httpMethod' in event:
        method = event.get('httpMethod', '').upper()

    path = ''
    if 'rawPath' in event:
        path = event.get('rawPath', '')
    elif 'path' in event:
        path = event.get('path', '')
    elif 'requestContext' in event and 'http' in event['requestContext']:
        path = event['requestContext']['http'].get('path', '')

    path = path.rstrip('/') or '/'
    return method, path

def extract_jwt_claims(event):
    """Extracts verified Cognito JWT claims from API Gateway requestContext."""
    rc = event.get('requestContext', {})
    auth = rc.get('authorizer', {})

    if 'jwt' in auth and isinstance(auth['jwt'], dict) and 'claims' in auth['jwt']:
        return auth['jwt']['claims'] or {}

    if 'claims' in auth and isinstance(auth['claims'], dict):
        return auth['claims'] or {}

    return {}

def is_admin_user(claims, sub):
    """
    Authoritative admin determination:
    1. Checks 'cognito:groups' claim in verified JWT.
    2. Checks FindIt-Users table using primary key userId only.
    Never trusts request body JSON or client-supplied role flags.
    """
    groups = claims.get('cognito:groups') or []
    if isinstance(groups, str) and groups.strip().lower() == 'admin':
        return True
    if isinstance(groups, list) and any(str(g).strip().lower() == 'admin' for g in groups):
        return True

    if sub:
        try:
            res = users_table.get_item(Key={'userId': sub})
            user_rec = res.get('Item')
            if user_rec and str(user_rec.get('role', '')).strip().lower() == 'admin':
                return True
        except Exception as e:
            print(f"Warning: Failed to check user role in FindIt-Users for userId {sub}: {e}")

    return False

def to_dynamo_value(val):
    """Converts a Python value to low-level DynamoDB AttributeValue format."""
    if val is None:
        return {'NULL': True}
    if isinstance(val, bool):
        return {'BOOL': val}
    if isinstance(val, (int, float, Decimal)):
        return {'N': str(val)}
    if isinstance(val, str):
        return {'S': val}
    if isinstance(val, list):
        return {'L': [to_dynamo_value(x) for x in val]}
    if isinstance(val, dict):
        return {'M': {k: to_dynamo_value(v) for k, v in val.items()}}
    return {'S': str(val)}

def to_dynamo_item(py_dict):
    """Converts a standard Python dictionary to low-level DynamoDB Item map."""
    return {k: to_dynamo_value(v) for k, v in py_dict.items()}

def is_base64_image(val):
    """Detects raw Base64 image payloads to protect DynamoDB 400KB item limit."""
    if not isinstance(val, str):
        return False
    if val.startswith('data:image/'):
        return True
    if len(val) > 1024 and re.match(r'^[A-Za-z0-9+/=]+$', val[:200]):
        return True
    return False

def generate_presigned_get_url(image_key, expiry=3600):
    """Generates a pre-signed S3 GET URL for an item's private S3 object key."""
    if not image_key or not isinstance(image_key, str) or not image_key.strip():
        return None
    try:
        url = s3_client.generate_presigned_url(
            ClientMethod='get_object',
            Params={
                'Bucket': S3_BUCKET_NAME,
                'Key': image_key.strip()
            },
            ExpiresIn=expiry
        )
        return url
    except Exception as e:
        print(f"Warning: Failed to generate pre-signed GET URL for key {image_key}: {e}")
        return None

def sanitize_claim_for_caller(claim, caller_sub, is_admin):
    """
    Protects private ownership verification evidence.
    verificationDetails and additionalInfo are only exposed to:
    - Claimant (claimedBy == caller_sub)
    - Finder (finderId == caller_sub)
    - Verified Administrator (is_admin == True)
    """
    c = dict(claim)
    is_claimant = (c.get('claimedBy') == caller_sub)
    is_finder = (c.get('finderId') == caller_sub)

    if not (is_claimant or is_finder or is_admin):
        c['verificationDetails'] = '[PROTECTED: Access restricted to claimant, finder, and administrators]'
        if c.get('additionalInfo'):
            c['additionalInfo'] = '[PROTECTED: Access restricted to claimant, finder, and administrators]'

    return c

# -------------------------------------------------------------------------
# Existing Core Route Handlers (Preserved)
# -------------------------------------------------------------------------
def handle_health():
    """GET /health - Preserved public health check."""
    return build_response(200, {
        'success': True,
        'message': 'FindIt backend is running!'
    })

def handle_users_me(event):
    """GET /users/me - Preserved authenticated user profile retrieval (PK: userId)."""
    claims = extract_jwt_claims(event)
    sub = claims.get('sub')
    if not sub:
        return build_response(401, {
            'success': False,
            'error': 'Unauthorized: Valid Cognito JWT is required.'
        })

    user_item = None
    try:
        user_res = users_table.get_item(Key={'userId': sub})
        user_item = user_res.get('Item')
    except Exception as e:
        print(f"Database error querying FindIt-Users for userId {sub}: {e}")
        return build_response(500, {
            'success': False,
            'error': 'Internal server error: Failed to query user profile database.'
        })

    if not user_item:
        email = claims.get('email', '')
        name = claims.get('name') or (email.split('@')[0] if email else 'Verified Member')
        now_iso = datetime.now(timezone.utc).isoformat()
        user_item = {
            'userId': sub,
            'id': sub,
            'email': email,
            'name': name,
            'role': 'user',
            'avatar': None,
            'createdAt': now_iso,
            'updatedAt': now_iso
        }
        try:
            users_table.put_item(Item=user_item)
        except Exception as e:
            print(f"Warning: Failed to auto-create user profile in FindIt-Users: {e}")

    return build_response(200, {
        'success': True,
        'user': user_item
    })

def handle_get_items(event):
    """
    GET /items - Preserved catalog retrieval with pagination, filtering & S3 pre-signed view URLs.
    Supports: type, category, search, limit, cursor.
    """
    q_params = event.get('queryStringParameters') or {}
    type_filter = q_params.get('type')
    category_filter = q_params.get('category')
    search_filter = q_params.get('search')
    limit_param = q_params.get('limit')
    cursor = q_params.get('cursor') or q_params.get('nextToken')

    all_items = []
    scan_kwargs = {}

    try:
        while True:
            scan_res = items_table.scan(**scan_kwargs)
            all_items.extend(scan_res.get('Items', []))
            if 'LastEvaluatedKey' in scan_res:
                scan_kwargs['ExclusiveStartKey'] = scan_res['LastEvaluatedKey']
            else:
                break
    except Exception as e:
        print(f"Error scanning FindIt-Items: {e}")
        return build_response(500, {
            'success': False,
            'error': f"Failed to retrieve items from database: {str(e)}"
        })

    if not all_items:
        return build_response(200, {
            'success': True,
            'items': [],
            'total': 0
        })

    filtered = []
    for item in all_items:
        if type_filter and str(item.get('type', '')).strip().lower() != type_filter.strip().lower():
            continue

        if category_filter and str(item.get('category', '')).strip().lower() != category_filter.strip().lower():
            continue

        if search_filter:
            kw = search_filter.strip().lower()
            name_text = str(item.get('name', '')).lower()
            desc_text = str(item.get('description', '')).lower()
            loc_text = str(item.get('location', '')).lower()
            tags = item.get('tags') or []
            tag_text = ' '.join(str(t).lower() for t in tags)

            if (kw not in name_text and
                kw not in desc_text and
                kw not in loc_text and
                kw not in tag_text):
                continue

        item_id = item.get('itemId') or item.get('id')
        stored_key = item.get('imageKey')

        display_image = None
        display_images = []

        if stored_key:
            presigned_view_url = generate_presigned_get_url(stored_key, expiry=3600)
            if presigned_view_url:
                display_image = presigned_view_url
                display_images = [presigned_view_url]
        else:
            raw_img = item.get('image')
            if raw_img and not is_base64_image(raw_img):
                display_image = str(raw_img).strip()
            raw_imgs = item.get('images') or []
            display_images = [str(img).strip() for img in raw_imgs if img and not is_base64_image(img)]
            if display_image and display_image not in display_images:
                display_images.insert(0, display_image)

        sanitized = {
            'itemId': item_id,
            'id': item_id,
            'type': item.get('type'),
            'name': item.get('name'),
            'category': item.get('category'),
            'description': item.get('description'),
            'location': item.get('location'),
            'date': item.get('date'),
            'reporterName': item.get('reporterName', 'Verified Member'),
            'status': item.get('status', 'active'),
            'activeClaimId': item.get('activeClaimId'),
            'image': display_image,
            'images': display_images,
            'imageKey': stored_key,
            'tags': item.get('tags', []),
            'createdAt': item.get('createdAt')
        }
        filtered.append(sanitized)

    filtered.sort(key=lambda x: str(x.get('createdAt') or ''), reverse=True)

    total_count = len(filtered)
    page_limit = 50
    if limit_param:
        try:
            page_limit = max(1, min(100, int(limit_param)))
        except ValueError:
            page_limit = 50

    start_idx = 0
    if cursor:
        try:
            start_idx = max(0, int(cursor))
        except ValueError:
            start_idx = 0

    paginated_items = filtered[start_idx : start_idx + page_limit]
    next_cursor = None
    if start_idx + page_limit < total_count:
        next_cursor = str(start_idx + page_limit)

    res_payload = {
        'success': True,
        'items': paginated_items,
        'total': total_count
    }
    if next_cursor:
        res_payload['nextCursor'] = next_cursor

    return build_response(200, res_payload)

def handle_post_items(event):
    """
    POST /items - Preserved authenticated item reporting.
    Authoritative sub extracted from Cognito JWT claims. Supports optional imageKey.
    """
    claims = extract_jwt_claims(event)
    sub = claims.get('sub')
    if not sub:
        return build_response(401, {
            'success': False,
            'error': 'Unauthorized: An authenticated Cognito JWT is required to submit an item.'
        })

    body_raw = event.get('body')
    if not body_raw:
        return build_response(400, {
            'success': False,
            'error': 'Bad Request: Missing request body.'
        })

    if isinstance(body_raw, str):
        try:
            data = json.loads(body_raw)
        except Exception:
            return build_response(400, {
                'success': False,
                'error': 'Bad Request: Invalid JSON body format.'
            })
    elif isinstance(body_raw, dict):
        data = body_raw
    else:
        return build_response(400, {
            'success': False,
            'error': 'Bad Request: Unsupported body payload.'
        })

    item_type = str(data.get('type') or '').strip().lower()
    if item_type not in ['lost', 'found']:
        return build_response(400, {
            'success': False,
            'error': "Validation Error: Field 'type' is required and must be either 'lost' or 'found'."
        })

    name = str(data.get('name') or '').strip()
    if not name:
        return build_response(400, {
            'success': False,
            'error': "Validation Error: Field 'name' is required."
        })

    category = str(data.get('category') or '').strip()
    if not category:
        return build_response(400, {
            'success': False,
            'error': "Validation Error: Field 'category' is required."
        })

    description = str(data.get('description') or '').strip()
    if not description:
        return build_response(400, {
            'success': False,
            'error': "Validation Error: Field 'description' is required."
        })

    location = str(data.get('location') or '').strip()
    if not location:
        return build_response(400, {
            'success': False,
            'error': "Validation Error: Field 'location' is required."
        })

    date = str(data.get('date') or '').strip()
    if not date:
        return build_response(400, {
            'success': False,
            'error': "Validation Error: Field 'date' is required."
        })

    image = data.get('image')
    images = data.get('images') or []

    if is_base64_image(image):
        return build_response(400, {
            'success': False,
            'error': "Validation Error: Raw Base64 image data is rejected to protect database limits. Please use the S3 upload service."
        })

    for img in images:
        if is_base64_image(img):
            return build_response(400, {
                'success': False,
                'error': "Validation Error: Raw Base64 image data in 'images' is rejected to protect database limits."
            })

    raw_image_key = data.get('imageKey')
    image_key = None
    if raw_image_key:
        if not isinstance(raw_image_key, str) or not raw_image_key.strip():
            return build_response(400, {
                'success': False,
                'error': "Validation Error: 'imageKey' must be a valid non-empty string."
            })
        clean_key = raw_image_key.strip()
        expected_prefix = f"uploads/{sub}/"
        if not clean_key.startswith(expected_prefix) or '..' in clean_key:
            return build_response(400, {
                'success': False,
                'error': f"Validation Error: 'imageKey' must begin with '{expected_prefix}' belonging to the authenticated user."
            })
        image_key = clean_key

    reporter_name = claims.get('name')
    try:
        user_res = users_table.get_item(Key={'userId': sub})
        user_item = user_res.get('Item')
        if user_item and user_item.get('name'):
            reporter_name = user_item.get('name')
    except Exception as e:
        print(f"Notice: Could not look up user profile for userId {sub}: {e}")

    if not reporter_name:
        email = claims.get('email', '')
        reporter_name = email.split('@')[0] if email else 'Verified Member'

    tags = data.get('tags')
    if isinstance(tags, str):
        tags = [t.strip().lower() for t in tags.split(',') if t.strip()]
    elif isinstance(tags, list):
        tags = [str(t).strip().lower() for t in tags if str(t).strip()]
    else:
        tags = []

    if image_key:
        db_image = None
        db_images = []
    else:
        db_image = str(image).strip() if image and not is_base64_image(image) else None
        db_images = [str(img).strip() for img in images if img and not is_base64_image(img)]
        if db_image and db_image not in db_images:
            db_images.insert(0, db_image)

    item_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()

    item_record = {
        'itemId': item_id,
        'id': item_id,
        'type': item_type,
        'name': name,
        'category': category,
        'description': description,
        'location': location,
        'date': date,
        'tags': tags,
        'reportedBy': sub,
        'reporterName': reporter_name,
        'status': 'active',
        'image': db_image,
        'images': db_images,
        'imageKey': image_key,
        'createdAt': created_at,
        'updatedAt': created_at
    }

    try:
        items_table.put_item(Item=item_record)
    except Exception as e:
        print(f"Error putting item into FindIt-Items: {e}")
        return build_response(500, {
            'success': False,
            'error': f"Failed to save item in DynamoDB: {str(e)}"
        })

    response_item = dict(item_record)
    if image_key:
        presigned_view_url = generate_presigned_get_url(image_key, expiry=3600)
        response_item['image'] = presigned_view_url
        response_item['images'] = [presigned_view_url] if presigned_view_url else []

    return build_response(201, {
        'success': True,
        'item': response_item
    })

def handle_presign_upload(event):
    """
    POST /uploads/presign - Preserved secure S3 pre-signed PUT upload URL generation.
    - Requires authenticated Cognito JWT.
    - Validates contentType (strictly JPEG, PNG, WebP).
    - Generates unique key: uploads/{sub}/{uuid}{ext}.
    """
    claims = extract_jwt_claims(event)
    sub = claims.get('sub')
    if not sub:
        return build_response(401, {
            'success': False,
            'error': 'Unauthorized: An authenticated Cognito JWT is required to upload images.'
        })

    body_raw = event.get('body')
    if not body_raw:
        return build_response(400, {
            'success': False,
            'error': 'Bad Request: Missing request body.'
        })

    if isinstance(body_raw, str):
        try:
            data = json.loads(body_raw)
        except Exception:
            return build_response(400, {
                'success': False,
                'error': 'Bad Request: Invalid JSON body format.'
            })
    elif isinstance(body_raw, dict):
        data = body_raw
    else:
        return build_response(400, {
            'success': False,
            'error': 'Bad Request: Unsupported body payload.'
        })

    content_type = str(data.get('contentType') or '').strip().lower()
    if not content_type:
        return build_response(400, {
            'success': False,
            'error': "Validation Error: 'contentType' is required."
        })

    if content_type == 'image/jpg':
        content_type = 'image/jpeg'

    if content_type not in ALLOWED_IMAGE_TYPES:
        return build_response(400, {
            'success': False,
            'error': "Validation Error: Unsupported image type. Allowed types are image/jpeg, image/png, and image/webp."
        })

    extension = ALLOWED_IMAGE_TYPES[content_type]
    unique_file_id = str(uuid.uuid4())
    image_key = f"uploads/{sub}/{unique_file_id}{extension}"
    expiry_seconds = 300

    try:
        presigned_url = s3_client.generate_presigned_url(
            ClientMethod='put_object',
            Params={
                'Bucket': S3_BUCKET_NAME,
                'Key': image_key,
                'ContentType': content_type
            },
            ExpiresIn=expiry_seconds
        )
    except Exception as e:
        print(f"Error generating S3 pre-signed upload URL: {e}")
        return build_response(500, {
            'success': False,
            'error': f"Failed to generate pre-signed upload URL: {str(e)}"
        })

    return build_response(200, {
        'success': True,
        'uploadUrl': presigned_url,
        'imageKey': image_key,
        'expiresIn': expiry_seconds
    })

# -------------------------------------------------------------------------
# Corrected Claims Route Handlers
# -------------------------------------------------------------------------

def handle_get_claims(event):
    """
    GET /claims
    NOTE ON PROTOTYPE DATA ACCESS (NO-GSI TABLE DESIGN):
    FindIt-Claims currently uses a single partition key 'claimId' without Global Secondary Indexes (GSIs).
    In this prototype demo, filtered table scans with client-side sorting and numeric offset pagination
    are used to satisfy queries. This is an explicit, temporary, small-dataset approach.
    Production deployments should provision GSIs on 'claimedBy', 'finderId', and 'itemId' for O(1) queries.

    Caller Scoping & Role Semantics:
    - Normal Users: Can only retrieve claims where they are the claimant (claimedBy == sub)
      or the finder (finderId == sub).
      * role='claimant': returns only claims filed by this user.
      * role='finder': returns only incoming claims on found items reported by this user.
      * role omitted / 'all': returns both submitted and incoming claims.
    - Administrators: Verified via Cognito group 'admin' or FindIt-Users table.
      * Can view all claims across the institution.
      * role='claimant': filters to claims where claimedBy == admin's sub.
      * role='finder': filters to claims where finderId == admin's sub.
      * status: filters by claim status (e.g. PENDING_ADMIN_REVIEW, ADMIN_REVIEW_REQUESTED).
      * itemId: filters to claims for a specific item.
    - Privacy: verificationDetails and additionalInfo are redacted for any third parties.
    """
    claims_jwt = extract_jwt_claims(event)
    sub = claims_jwt.get('sub')
    if not sub:
        return build_response(401, {
            'success': False,
            'error': 'Unauthorized: An authenticated Cognito JWT is required to list claims.'
        })

    is_admin = is_admin_user(claims_jwt, sub)

    q_params = event.get('queryStringParameters') or {}
    role_param = str(q_params.get('role') or '').strip().lower()
    status_param = str(q_params.get('status') or '').strip()
    item_id_param = str(q_params.get('itemId') or '').strip()
    limit_param = q_params.get('limit')
    cursor_param = q_params.get('cursor') or q_params.get('nextToken')

    # Validate limit
    page_limit = 50
    if limit_param is not None and str(limit_param).strip() != '':
        try:
            parsed_limit = int(limit_param)
            if parsed_limit < 1:
                return build_response(400, {
                    'success': False,
                    'error': "Validation Error: 'limit' parameter must be a positive integer between 1 and 100."
                })
            page_limit = max(1, min(100, parsed_limit))
        except ValueError:
            return build_response(400, {
                'success': False,
                'error': "Validation Error: 'limit' parameter must be a valid integer."
            })

    # Validate numeric offset cursor
    start_idx = 0
    if cursor_param is not None and str(cursor_param).strip() != '':
        try:
            start_idx = int(cursor_param)
            if start_idx < 0:
                return build_response(400, {
                    'success': False,
                    'error': "Validation Error: Pagination 'cursor' must be a non-negative integer offset."
                })
        except ValueError:
            return build_response(400, {
                'success': False,
                'error': "Validation Error: Pagination 'cursor' must be a valid integer offset index."
            })

    all_claims = []
    scan_kwargs = {}

    try:
        while True:
            scan_res = claims_table.scan(**scan_kwargs)
            all_claims.extend(scan_res.get('Items', []))
            if 'LastEvaluatedKey' in scan_res:
                scan_kwargs['ExclusiveStartKey'] = scan_res['LastEvaluatedKey']
            else:
                break
    except Exception as e:
        print(f"Error scanning FindIt-Claims: {e}")
        return build_response(500, {
            'success': False,
            'error': f"Failed to retrieve claims from database: {str(e)}"
        })

    filtered = []
    for c in all_claims:
        c_claimed_by = str(c.get('claimedBy') or '')
        c_finder_id = str(c.get('finderId') or '')

        if not is_admin:
            if c_claimed_by != sub and c_finder_id != sub:
                continue
            if role_param == 'claimant' and c_claimed_by != sub:
                continue
            if role_param == 'finder' and c_finder_id != sub:
                continue
        else:
            if role_param == 'claimant' and c_claimed_by != sub:
                continue
            if role_param == 'finder' and c_finder_id != sub:
                continue

        if status_param and str(c.get('status') or '').strip().lower() != status_param.lower():
            continue

        if item_id_param and str(c.get('itemId') or '') != item_id_param:
            continue

        sanitized = sanitize_claim_for_caller(c, caller_sub=sub, is_admin=is_admin)
        filtered.append(sanitized)

    filtered.sort(key=lambda x: str(x.get('createdAt') or ''), reverse=True)

    total_count = len(filtered)
    paginated_claims = filtered[start_idx : start_idx + page_limit]
    next_cursor = None
    if start_idx + page_limit < total_count:
        next_cursor = str(start_idx + page_limit)

    res_payload = {
        'success': True,
        'claims': paginated_claims,
        'total': total_count,
        'limit': page_limit,
        'offset': start_idx,
    }
    if next_cursor is not None:
        res_payload['nextCursor'] = next_cursor

    return build_response(200, res_payload)

def handle_get_claim_by_id(event, claim_id):
    """
    GET /claims/{claimId}
    Retrieves full claim record and audit trail.
    Enforces authorization: Caller must be claimant, finder, or verified admin.
    """
    claims_jwt = extract_jwt_claims(event)
    sub = claims_jwt.get('sub')
    if not sub:
        return build_response(401, {
            'success': False,
            'error': 'Unauthorized: An authenticated Cognito JWT is required to view claim details.'
        })

    is_admin = is_admin_user(claims_jwt, sub)

    try:
        res = claims_table.get_item(Key={'claimId': claim_id})
        claim = res.get('Item')
    except Exception as e:
        print(f"Error querying FindIt-Claims for claimId {claim_id}: {e}")
        return build_response(500, {
            'success': False,
            'error': f"Failed to retrieve claim: {str(e)}"
        })

    if not claim:
        return build_response(404, {
            'success': False,
            'error': f"Claim '{claim_id}' not found."
        })

    is_claimant = (claim.get('claimedBy') == sub)
    is_finder = (claim.get('finderId') == sub)

    if not (is_claimant or is_finder or is_admin):
        return build_response(403, {
            'success': False,
            'error': "Access forbidden: You do not have permission to inspect this claim."
        })

    sanitized = sanitize_claim_for_caller(claim, caller_sub=sub, is_admin=is_admin)

    return build_response(200, {
        'success': True,
        'claim': sanitized
    })

def handle_post_claims(event):
    """
    POST /claims
    Submits a new ownership claim against a found item.
    - Validates caller authentication and authoritative claimant identity.
    - Uses exact primary key lookup on FindIt-Items: Key={'itemId': item_id}.
    - Requires item to exist, be of type 'found', and not be 'returned'.
    - Rejects claims by the reporter against their own found item.
    - Rejects if caller already has an ongoing active claim for this item.
    - Uses TransactWriteItems to atomically create claim, set item activeClaimId & status to 'claimed',
      and write the initial activity log with condition checking.
    """
    claims_jwt = extract_jwt_claims(event)
    sub = claims_jwt.get('sub')
    if not sub:
        return build_response(401, {
            'success': False,
            'error': 'Unauthorized: An authenticated Cognito JWT is required to file a claim.'
        })

    body_raw = event.get('body')
    if not body_raw:
        return build_response(400, {
            'success': False,
            'error': 'Bad Request: Missing request body.'
        })

    if isinstance(body_raw, str):
        try:
            data = json.loads(body_raw)
        except Exception:
            return build_response(400, {
                'success': False,
                'error': 'Bad Request: Invalid JSON body format.'
            })
    elif isinstance(body_raw, dict):
        data = body_raw
    else:
        return build_response(400, {
            'success': False,
            'error': 'Bad Request: Unsupported body payload.'
        })

    item_id = str(data.get('itemId') or '').strip()
    if not item_id:
        return build_response(400, {
            'success': False,
            'error': "Validation Error: Field 'itemId' is required."
        })

    reason = str(data.get('reason') or '').strip()
    if not reason or len(reason) < 10:
        return build_response(400, {
            'success': False,
            'error': "Validation Error: Field 'reason' is required and must be at least 10 characters."
        })

    verification_details = str(data.get('verificationDetails') or '').strip()
    if not verification_details or len(verification_details) < 10:
        return build_response(400, {
            'success': False,
            'error': "Validation Error: Field 'verificationDetails' is required and must be at least 10 characters."
        })

    additional_info = str(data.get('additionalInfo') or '').strip()

    # Retrieve target item strictly by primary key itemId
    try:
        item_res = items_table.get_item(Key={'itemId': item_id})
        item = item_res.get('Item')
    except Exception as e:
        print(f"Error querying FindIt-Items for itemId {item_id}: {e}")
        return build_response(500, {
            'success': False,
            'error': f"Database error checking item: {str(e)}"
        })

    if not item:
        return build_response(404, {
            'success': False,
            'error': f"Target item '{item_id}' not found."
        })

    if str(item.get('type') or '').lower() != 'found':
        return build_response(400, {
            'success': False,
            'error': "Invalid claim target: Claims can only be filed against found property listings."
        })

    if str(item.get('status') or '').lower() == 'returned':
        return build_response(400, {
            'success': False,
            'error': "This item has already been returned to its owner and is closed to new claims."
        })

    finder_id = str(item.get('reportedBy') or '')
    if finder_id == sub:
        return build_response(400, {
            'success': False,
            'error': "You cannot file an ownership claim against an item you reported yourself."
        })

    if str(item.get('status') or '').lower() == 'claimed' and item.get('activeClaimId'):
        return build_response(400, {
            'success': False,
            'error': "This item is currently undergoing an active claim review and cannot accept new claims."
        })

    # Check for existing active claims by this claimant on this item
    try:
        scan_res = claims_table.scan()
        for existing in scan_res.get('Items', []):
            if (existing.get('itemId') == item_id and
                existing.get('claimedBy') == sub and
                existing.get('status') not in ['ADMIN_REJECTED', 'COMPLETED']):
                return build_response(400, {
                    'success': False,
                    'error': f"You already have an active claim petition ({existing.get('status')}) for this item."
                })
    except Exception as e:
        print(f"Notice: Failed to pre-scan existing claims for user {sub}: {e}")

    # Determine claimant name & email
    claimer_email = claims_jwt.get('email', '')
    claimer_name = claims_jwt.get('name')
    if not claimer_name:
        try:
            u_res = users_table.get_item(Key={'userId': sub})
            u_item = u_res.get('Item')
            if u_item and u_item.get('name'):
                claimer_name = u_item.get('name')
        except Exception:
            pass
    if not claimer_name:
        claimer_name = claimer_email.split('@')[0] if claimer_email else 'Verified Member'

    finder_name = item.get('reporterName') or 'Verified Member'

    claim_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    history_entry = {
        'id': f"h-{int(datetime.now(timezone.utc).timestamp() * 1000)}#{uuid.uuid4().hex[:6]}",
        'action': 'Claim Submitted',
        'performedBy': claimer_name,
        'role': 'claimant',
        'timestamp': now_iso,
        'comment': 'Initial claim submitted with private ownership verification details.',
    }

    claim_record = {
        'claimId': claim_id,
        'id': claim_id,
        'itemId': item_id,
        'claimedBy': sub,
        'claimerName': claimer_name,
        'claimerEmail': claimer_email,
        'finderId': finder_id,
        'finderName': finder_name,
        'reason': reason,
        'verificationDetails': verification_details,
        'additionalInfo': additional_info,
        'status': 'PENDING_FINDER_REVIEW',
        'finderRejectionReason': '',
        'disputeReason': '',
        'adminReviewComment': '',
        'finderHandoverConfirmed': False,
        'claimantHandoverConfirmed': False,
        'handoverCompletedAt': None,
        'history': [history_entry],
        'createdAt': now_iso,
        'updatedAt': now_iso,
    }

    activity_action_id = f"{now_iso}#CLAIM_SUBMITTED#{uuid.uuid4().hex}"
    activity_record = {
        'entityId': claim_id,
        'timestampActionId': activity_action_id,
        'action': 'CLAIM_SUBMITTED',
        'actorSub': sub,
        'actorName': claimer_name,
        'actorRole': 'claimant',
        'details': 'Ownership claim filed with private verification proof.',
        'previousStatus': None,
        'newStatus': 'PENDING_FINDER_REVIEW',
        'timestamp': now_iso,
    }

    # Execute atomic 3-way transaction
    try:
        dynamodb_client.transact_write_items(
            TransactItems=[
                {
                    'Put': {
                        'TableName': CLAIMS_TABLE_NAME,
                        'Item': to_dynamo_item(claim_record),
                        'ConditionExpression': 'attribute_not_exists(claimId)',
                    }
                },
                {
                    'Update': {
                        'TableName': ITEMS_TABLE_NAME,
                        'Key': {'itemId': {'S': item_id}},
                        'UpdateExpression': 'SET #st = :claimed_st, #ac = :claim_id, #up = :now',
                        'ConditionExpression': '#st = :active_st AND (attribute_not_exists(#ac) OR #ac = :null_val OR #ac = :empty_val)',
                        'ExpressionAttributeNames': {
                            '#st': 'status',
                            '#ac': 'activeClaimId',
                            '#up': 'updatedAt',
                        },
                        'ExpressionAttributeValues': {
                            ':claimed_st': {'S': 'claimed'},
                            ':claim_id': {'S': claim_id},
                            ':now': {'S': now_iso},
                            ':active_st': {'S': 'active'},
                            ':null_val': {'NULL': True},
                            ':empty_val': {'S': ''},
                        },
                    }
                },
                {
                    'Put': {
                        'TableName': ACTIVITY_LOG_TABLE_NAME,
                        'Item': to_dynamo_item(activity_record),
                        'ConditionExpression': 'attribute_not_exists(timestampActionId)',
                    }
                }
            ]
        )
    except Exception as e:
        err_msg = str(e)
        if 'ConditionalCheckFailed' in err_msg or 'TransactionCanceledException' in err_msg:
            return build_response(409, {
                'success': False,
                'error': "Conflict: This item has just been claimed by another user or is no longer available for new claims."
            })
        print(f"Error executing transact_write_items for claim creation: {e}")
        return build_response(500, {
            'success': False,
            'error': f"Failed to submit claim: {err_msg}"
        })

    return build_response(201, {
        'success': True,
        'message': 'Claim submitted successfully.',
        'claim': claim_record
    })

def handle_finder_decision(event, claim_id):
    """
    POST /claims/{claimId}/finder-decision
    Finder review evaluation:
    - Only the item's finder can execute this decision.
    - Permitted only from PENDING_FINDER_REVIEW status.
    - decision: 'approve' -> moves to PENDING_ADMIN_REVIEW.
    - decision: 'reject'  -> requires mandatory rejection reason; moves to FINDER_REJECTED.
      (Item remains reserved under activeClaimId so claimant has opportunity to dispute).
    - Transactional: writes claim update and activity record together using TransactWriteItems.
    """
    claims_jwt = extract_jwt_claims(event)
    sub = claims_jwt.get('sub')
    if not sub:
        return build_response(401, {
            'success': False,
            'error': 'Unauthorized: An authenticated Cognito JWT is required to review this claim.'
        })

    body_raw = event.get('body')
    data = {}
    if body_raw:
        if isinstance(body_raw, str):
            try:
                data = json.loads(body_raw)
            except Exception:
                return build_response(400, {'success': False, 'error': 'Bad Request: Invalid JSON body.'})
        elif isinstance(body_raw, dict):
            data = body_raw

    decision = str(data.get('decision') or '').strip().lower()
    if decision not in ['approve', 'reject']:
        return build_response(400, {
            'success': False,
            'error': "Validation Error: 'decision' must be either 'approve' or 'reject'."
        })

    try:
        res = claims_table.get_item(Key={'claimId': claim_id})
        claim = res.get('Item')
    except Exception as e:
        return build_response(500, {'success': False, 'error': f"Database error retrieving claim: {str(e)}"})

    if not claim:
        return build_response(404, {'success': False, 'error': f"Claim '{claim_id}' not found."})

    if claim.get('finderId') != sub:
        return build_response(403, {
            'success': False,
            'error': "Access forbidden: Only the finder of this item can submit a review decision."
        })

    current_status = claim.get('status')
    if current_status != 'PENDING_FINDER_REVIEW':
        return build_response(400, {
            'success': False,
            'error': f"Invalid action: Claim is in status '{current_status}', not awaiting finder review."
        })

    now_iso = datetime.now(timezone.utc).isoformat()
    rejection_reason = ''
    if decision == 'approve':
        new_status = 'PENDING_ADMIN_REVIEW'
        action_name = 'Finder Approved'
        comment = str(data.get('comment') or 'Finder verified ownership evidence and forwarded claim for administrative review.').strip()
    else:
        rejection_reason = str(data.get('rejectionReason') or data.get('comment') or '').strip()
        if not rejection_reason or len(rejection_reason) < 5:
            return build_response(400, {
                'success': False,
                'error': "Validation Error: A substantive rejection reason (at least 5 characters) is required when rejecting a claim."
            })
        new_status = 'FINDER_REJECTED'
        action_name = 'Finder Rejected'
        comment = rejection_reason

    history_entry = {
        'id': f"h-{int(datetime.now(timezone.utc).timestamp() * 1000)}#{uuid.uuid4().hex[:6]}",
        'action': action_name,
        'performedBy': claim.get('finderName') or 'Finder',
        'role': 'finder',
        'timestamp': now_iso,
        'comment': comment,
    }

    updated_history = list(claim.get('history') or []) + [history_entry]

    update_expr = "SET #st = :new_st, #hist = :hist, #up = :now"
    expr_names = {'#st': 'status', '#hist': 'history', '#up': 'updatedAt'}
    expr_values = {
        ':new_st': {'S': new_status},
        ':hist': to_dynamo_value(updated_history),
        ':now': {'S': now_iso},
        ':expected_st': {'S': 'PENDING_FINDER_REVIEW'}
    }

    if decision == 'reject':
        update_expr += ", #rr = :rej_reason"
        expr_names['#rr'] = 'finderRejectionReason'
        expr_values[':rej_reason'] = {'S': rejection_reason}

    activity_action_id = f"{now_iso}#{action_name.replace(' ', '_').upper()}#{uuid.uuid4().hex}"
    activity_record = {
        'entityId': claim_id,
        'timestampActionId': activity_action_id,
        'action': 'FINDER_DECISION',
        'actorSub': sub,
        'actorName': claim.get('finderName') or 'Finder',
        'actorRole': 'finder',
        'details': comment,
        'previousStatus': current_status,
        'newStatus': new_status,
        'timestamp': now_iso,
    }

    try:
        dynamodb_client.transact_write_items(
            TransactItems=[
                {
                    'Update': {
                        'TableName': CLAIMS_TABLE_NAME,
                        'Key': {'claimId': {'S': claim_id}},
                        'UpdateExpression': update_expr,
                        'ConditionExpression': '#st = :expected_st',
                        'ExpressionAttributeNames': expr_names,
                        'ExpressionAttributeValues': expr_values,
                    }
                },
                {
                    'Put': {
                        'TableName': ACTIVITY_LOG_TABLE_NAME,
                        'Item': to_dynamo_item(activity_record),
                        'ConditionExpression': 'attribute_not_exists(timestampActionId)',
                    }
                }
            ]
        )
    except Exception as e:
        err_msg = str(e)
        if 'ConditionalCheckFailed' in err_msg or 'TransactionCanceledException' in err_msg:
            return build_response(409, {
                'success': False,
                'error': "Conflict: Claim status was modified concurrently by another operation."
            })
        return build_response(500, {'success': False, 'error': f"Failed to record finder decision: {err_msg}"})

    claim['status'] = new_status
    claim['updatedAt'] = now_iso
    claim['history'] = updated_history
    if decision == 'reject':
        claim['finderRejectionReason'] = rejection_reason

    return build_response(200, {
        'success': True,
        'message': f"Claim successfully updated to {new_status}.",
        'claim': claim
    })

def handle_dispute(event, claim_id):
    """
    POST /claims/{claimId}/dispute
    Claimant dispute submission:
    - Only the claimant can file a dispute.
    - Permitted only from FINDER_REJECTED status.
    - Requires non-empty disputeReason (min 10 characters).
    - Moves status to ADMIN_REVIEW_REQUESTED.
    - Transactional: writes claim update and activity record together using TransactWriteItems.
    """
    claims_jwt = extract_jwt_claims(event)
    sub = claims_jwt.get('sub')
    if not sub:
        return build_response(401, {
            'success': False,
            'error': 'Unauthorized: An authenticated Cognito JWT is required to file a dispute.'
        })

    body_raw = event.get('body')
    data = {}
    if body_raw:
        if isinstance(body_raw, str):
            try:
                data = json.loads(body_raw)
            except Exception:
                return build_response(400, {'success': False, 'error': 'Bad Request: Invalid JSON body.'})
        elif isinstance(body_raw, dict):
            data = body_raw

    dispute_reason = str(data.get('disputeReason') or data.get('comment') or '').strip()
    if not dispute_reason or len(dispute_reason) < 10:
        return build_response(400, {
            'success': False,
            'error': "Validation Error: Field 'disputeReason' is required and must be at least 10 characters."
        })

    try:
        res = claims_table.get_item(Key={'claimId': claim_id})
        claim = res.get('Item')
    except Exception as e:
        return build_response(500, {'success': False, 'error': f"Database error retrieving claim: {str(e)}"})

    if not claim:
        return build_response(404, {'success': False, 'error': f"Claim '{claim_id}' not found."})

    if claim.get('claimedBy') != sub:
        return build_response(403, {
            'success': False,
            'error': "Access forbidden: Only the claimant can file an administrative dispute for this claim."
        })

    current_status = claim.get('status')
    if current_status != 'FINDER_REJECTED':
        return build_response(400, {
            'success': False,
            'error': f"Invalid action: Disputes can only be requested for claims with status 'FINDER_REJECTED'. Current status: '{current_status}'."
        })

    now_iso = datetime.now(timezone.utc).isoformat()
    new_status = 'ADMIN_REVIEW_REQUESTED'

    history_entry = {
        'id': f"h-{int(datetime.now(timezone.utc).timestamp() * 1000)}#{uuid.uuid4().hex[:6]}",
        'action': 'Dispute Filed for Admin Review',
        'performedBy': claim.get('claimerName') or 'Claimant',
        'role': 'claimant',
        'timestamp': now_iso,
        'comment': dispute_reason,
    }

    updated_history = list(claim.get('history') or []) + [history_entry]

    activity_action_id = f"{now_iso}#DISPUTE_FILED#{uuid.uuid4().hex}"
    activity_record = {
        'entityId': claim_id,
        'timestampActionId': activity_action_id,
        'action': 'DISPUTE_FILED',
        'actorSub': sub,
        'actorName': claim.get('claimerName') or 'Claimant',
        'actorRole': 'claimant',
        'details': dispute_reason,
        'previousStatus': current_status,
        'newStatus': new_status,
        'timestamp': now_iso,
    }

    try:
        dynamodb_client.transact_write_items(
            TransactItems=[
                {
                    'Update': {
                        'TableName': CLAIMS_TABLE_NAME,
                        'Key': {'claimId': {'S': claim_id}},
                        'UpdateExpression': "SET #st = :new_st, #dr = :dr, #hist = :hist, #up = :now",
                        'ConditionExpression': '#st = :expected_st',
                        'ExpressionAttributeNames': {
                            '#st': 'status',
                            '#dr': 'disputeReason',
                            '#hist': 'history',
                            '#up': 'updatedAt',
                        },
                        'ExpressionAttributeValues': {
                            ':new_st': {'S': new_status},
                            ':dr': {'S': dispute_reason},
                            ':hist': to_dynamo_value(updated_history),
                            ':now': {'S': now_iso},
                            ':expected_st': {'S': 'FINDER_REJECTED'},
                        }
                    }
                },
                {
                    'Put': {
                        'TableName': ACTIVITY_LOG_TABLE_NAME,
                        'Item': to_dynamo_item(activity_record),
                        'ConditionExpression': 'attribute_not_exists(timestampActionId)',
                    }
                }
            ]
        )
    except Exception as e:
        err_msg = str(e)
        if 'ConditionalCheckFailed' in err_msg or 'TransactionCanceledException' in err_msg:
            return build_response(409, {
                'success': False,
                'error': "Conflict: Claim status was modified concurrently by another operation."
            })
        return build_response(500, {'success': False, 'error': f"Failed to record dispute transaction: {err_msg}"})

    claim['status'] = new_status
    claim['disputeReason'] = dispute_reason
    claim['updatedAt'] = now_iso
    claim['history'] = updated_history

    return build_response(200, {
        'success': True,
        'message': 'Dispute successfully filed for administrative evaluation.',
        'claim': claim
    })

def handle_admin_decision(event, claim_id):
    """
    POST /claims/{claimId}/admin-decision
    Administrative adjudication:
    - Authoritative role verification: Caller must be verified admin via Cognito group or Users table.
    - Permitted from PENDING_ADMIN_REVIEW or ADMIN_REVIEW_REQUESTED (overriding finder rejection).
    - decision: 'approve' -> ADMIN_APPROVED (ready for physical handover).
    - decision: 'reject'  -> ADMIN_REJECTED.
      Transactional item release:
      * Validates that target item is currently status 'claimed' with activeClaimId == claimId.
      * Atomically restores item status to 'active' and removes activeClaimId via DynamoDB REMOVE.
      * Aborts if the item belongs to another claim.
    """
    claims_jwt = extract_jwt_claims(event)
    sub = claims_jwt.get('sub')
    if not sub:
        return build_response(401, {
            'success': False,
            'error': 'Unauthorized: An authenticated Cognito JWT is required to execute administrative actions.'
        })

    if not is_admin_user(claims_jwt, sub):
        return build_response(403, {
            'success': False,
            'error': 'Access forbidden: Administrative privileges required.'
        })

    body_raw = event.get('body')
    data = {}
    if body_raw:
        if isinstance(body_raw, str):
            try:
                data = json.loads(body_raw)
            except Exception:
                return build_response(400, {'success': False, 'error': 'Bad Request: Invalid JSON body.'})
        elif isinstance(body_raw, dict):
            data = body_raw

    decision = str(data.get('decision') or '').strip().lower()
    if decision not in ['approve', 'reject']:
        return build_response(400, {
            'success': False,
            'error': "Validation Error: 'decision' must be either 'approve' or 'reject'."
        })

    comment = str(data.get('comment') or data.get('adminComment') or '').strip()
    if not comment or len(comment) < 5:
        return build_response(400, {
            'success': False,
            'error': "Validation Error: Administrative evaluation requires a documented review rationale (at least 5 characters)."
        })

    try:
        res = claims_table.get_item(Key={'claimId': claim_id})
        claim = res.get('Item')
    except Exception as e:
        return build_response(500, {'success': False, 'error': f"Database error retrieving claim: {str(e)}"})

    if not claim:
        return build_response(404, {'success': False, 'error': f"Claim '{claim_id}' not found."})

    current_status = claim.get('status')
    if current_status not in ['PENDING_ADMIN_REVIEW', 'ADMIN_REVIEW_REQUESTED']:
        return build_response(400, {
            'success': False,
            'error': f"Invalid action: Claim is currently in status '{current_status}', not pending administrative evaluation."
        })

    admin_name = claims_jwt.get('name') or 'Campus Administrator'
    now_iso = datetime.now(timezone.utc).isoformat()
    item_id = claim.get('itemId')

    if decision == 'approve':
        new_status = 'ADMIN_APPROVED'
        action_name = 'Admin Approved'

        history_entry = {
            'id': f"h-{int(datetime.now(timezone.utc).timestamp() * 1000)}#{uuid.uuid4().hex[:6]}",
            'action': action_name,
            'performedBy': admin_name,
            'role': 'admin',
            'timestamp': now_iso,
            'comment': comment,
        }
        updated_history = list(claim.get('history') or []) + [history_entry]

        activity_action_id = f"{now_iso}#ADMIN_APPROVED#{uuid.uuid4().hex}"
        activity_record = {
            'entityId': claim_id,
            'timestampActionId': activity_action_id,
            'action': 'ADMIN_DECISION_APPROVED',
            'actorSub': sub,
            'actorName': admin_name,
            'actorRole': 'admin',
            'details': comment,
            'previousStatus': current_status,
            'newStatus': new_status,
            'timestamp': now_iso,
        }

        try:
            dynamodb_client.transact_write_items(
                TransactItems=[
                    {
                        'Update': {
                            'TableName': CLAIMS_TABLE_NAME,
                            'Key': {'claimId': {'S': claim_id}},
                            'UpdateExpression': "SET #st = :new_st, #comm = :comm, #hist = :hist, #up = :now",
                            'ConditionExpression': '#st IN (:st1, :st2)',
                            'ExpressionAttributeNames': {
                                '#st': 'status',
                                '#comm': 'adminReviewComment',
                                '#hist': 'history',
                                '#up': 'updatedAt',
                            },
                            'ExpressionAttributeValues': {
                                ':new_st': {'S': new_status},
                                ':comm': {'S': comment},
                                ':hist': to_dynamo_value(updated_history),
                                ':now': {'S': now_iso},
                                ':st1': {'S': 'PENDING_ADMIN_REVIEW'},
                                ':st2': {'S': 'ADMIN_REVIEW_REQUESTED'},
                            }
                        }
                    },
                    {
                        'Put': {
                            'TableName': ACTIVITY_LOG_TABLE_NAME,
                            'Item': to_dynamo_item(activity_record),
                            'ConditionExpression': 'attribute_not_exists(timestampActionId)',
                        }
                    }
                ]
            )
        except Exception as e:
            err_msg = str(e)
            if 'ConditionalCheckFailed' in err_msg or 'TransactionCanceledException' in err_msg:
                return build_response(409, {
                    'success': False,
                    'error': "Conflict: Claim status was modified concurrently by another operation."
                })
            return build_response(500, {'success': False, 'error': f"Failed to record admin approval: {err_msg}"})

        claim['status'] = new_status
        claim['adminReviewComment'] = comment
        claim['updatedAt'] = now_iso
        claim['history'] = updated_history

        return build_response(200, {
            'success': True,
            'message': 'Claim approved by administrator and authorized for physical handover.',
            'claim': claim
        })

    else:
        new_status = 'ADMIN_REJECTED'
        action_name = 'Admin Rejected'

        # Pre-verify target item strictly by itemId partition key
        try:
            item_res = items_table.get_item(Key={'itemId': item_id})
            item_rec = item_res.get('Item')
        except Exception as e:
            return build_response(500, {'success': False, 'error': f"Database error checking item: {str(e)}"})

        if not item_rec:
            return build_response(404, {'success': False, 'error': f"Associated item '{item_id}' not found."})

        # Strengthened ownership condition check:
        # Item must be in 'claimed' status with activeClaimId matching this exact claimId
        if item_rec.get('activeClaimId') != claim_id or str(item_rec.get('status') or '').lower() != 'claimed':
            return build_response(409, {
                'success': False,
                'error': f"Conflict: Target item '{item_id}' is not currently active under claim '{claim_id}' and cannot be released."
            })

        history_entry = {
            'id': f"h-{int(datetime.now(timezone.utc).timestamp() * 1000)}#{uuid.uuid4().hex[:6]}",
            'action': action_name,
            'performedBy': admin_name,
            'role': 'admin',
            'timestamp': now_iso,
            'comment': comment,
        }
        updated_history = list(claim.get('history') or []) + [history_entry]

        activity_action_id = f"{now_iso}#ADMIN_REJECTED#{uuid.uuid4().hex}"
        activity_record = {
            'entityId': claim_id,
            'timestampActionId': activity_action_id,
            'action': 'ADMIN_DECISION_REJECTED',
            'actorSub': sub,
            'actorName': admin_name,
            'actorRole': 'admin',
            'details': comment,
            'previousStatus': current_status,
            'newStatus': new_status,
            'timestamp': now_iso,
        }

        # Atomically mark claim rejected and restore item to active with REMOVE activeClaimId
        try:
            dynamodb_client.transact_write_items(
                TransactItems=[
                    {
                        'Update': {
                            'TableName': CLAIMS_TABLE_NAME,
                            'Key': {'claimId': {'S': claim_id}},
                            'UpdateExpression': 'SET #st = :new_st, #comm = :comm, #hist = :hist, #up = :now',
                            'ConditionExpression': '#st IN (:st1, :st2)',
                            'ExpressionAttributeNames': {
                                '#st': 'status',
                                '#comm': 'adminReviewComment',
                                '#hist': 'history',
                                '#up': 'updatedAt',
                            },
                            'ExpressionAttributeValues': {
                                ':new_st': {'S': new_status},
                                ':comm': {'S': comment},
                                ':hist': to_dynamo_value(updated_history),
                                ':now': {'S': now_iso},
                                ':st1': {'S': 'PENDING_ADMIN_REVIEW'},
                                ':st2': {'S': 'ADMIN_REVIEW_REQUESTED'},
                            }
                        }
                    },
                    {
                        'Update': {
                            'TableName': ITEMS_TABLE_NAME,
                            'Key': {'itemId': {'S': item_id}},
                            'UpdateExpression': 'SET #ist = :active_st, #up = :now REMOVE #ac',
                            'ConditionExpression': '#ist = :claimed_st AND #ac = :claim_id',
                            'ExpressionAttributeNames': {
                                '#ist': 'status',
                                '#ac': 'activeClaimId',
                                '#up': 'updatedAt',
                            },
                            'ExpressionAttributeValues': {
                                ':active_st': {'S': 'active'},
                                ':claimed_st': {'S': 'claimed'},
                                ':claim_id': {'S': claim_id},
                                ':now': {'S': now_iso},
                            }
                        }
                    },
                    {
                        'Put': {
                            'TableName': ACTIVITY_LOG_TABLE_NAME,
                            'Item': to_dynamo_item(activity_record),
                            'ConditionExpression': 'attribute_not_exists(timestampActionId)',
                        }
                    }
                ]
            )
        except Exception as e:
            err_msg = str(e)
            if 'ConditionalCheckFailed' in err_msg or 'TransactionCanceledException' in err_msg:
                return build_response(409, {
                    'success': False,
                    'error': "Conflict: Target item condition failed or claim status was modified concurrently."
                })
            return build_response(500, {'success': False, 'error': f"Failed to reject claim: {err_msg}"})

        claim['status'] = new_status
        claim['adminReviewComment'] = comment
        claim['updatedAt'] = now_iso
        claim['history'] = updated_history

        return build_response(200, {
            'success': True,
            'message': 'Claim rejected by administrator. Item restored to active catalog.',
            'claim': claim
        })

def handle_handover(event, claim_id):
    """
    POST /claims/{claimId}/handover
    Dual physical handover confirmation with retry and concurrency protection:
    - Only claimant or finder can confirm.
    - Requires ADMIN_APPROVED or HANDOVER_IN_PROGRESS status.
    - In case of conditional conflict, re-reads fresh claim and retries up to MAX_RETRIES times.
    - Prevents simultaneous confirmations from leaving both flags True while status remains HANDOVER_IN_PROGRESS.
    - When both confirmations exist, uses TransactWriteItems to atomically set claim to COMPLETED
      and item to 'returned' (with strengthened ownership check: status='claimed' AND activeClaimId=claimId).
    """
    claims_jwt = extract_jwt_claims(event)
    sub = claims_jwt.get('sub')
    if not sub:
        return build_response(401, {
            'success': False,
            'error': 'Unauthorized: An authenticated Cognito JWT is required to confirm handover.'
        })

    MAX_RETRIES = 5
    for attempt in range(MAX_RETRIES):
        # 1. Fresh read on every attempt (never rely on stale data)
        try:
            res = claims_table.get_item(Key={'claimId': claim_id})
            claim = res.get('Item')
        except Exception as e:
            return build_response(500, {'success': False, 'error': f"Database error retrieving claim: {str(e)}"})

        if not claim:
            return build_response(404, {'success': False, 'error': f"Claim '{claim_id}' not found."})

        is_finder = (claim.get('finderId') == sub)
        is_claimant = (claim.get('claimedBy') == sub)

        if not (is_finder or is_claimant):
            return build_response(403, {
                'success': False,
                'error': "Access forbidden: Only the verified claimant or finder can confirm physical property handover."
            })

        current_status = claim.get('status')
        if current_status == 'COMPLETED':
            return build_response(400, {
                'success': False,
                'error': "Invalid action: Handover has already been completed for this claim."
            })

        if current_status not in ['ADMIN_APPROVED', 'HANDOVER_IN_PROGRESS']:
            return build_response(400, {
                'success': False,
                'error': f"Invalid action: Physical handover can only be confirmed for claims with administrative approval. Current status: '{current_status}'."
            })

        caller_role = 'finder' if is_finder else 'claimant'
        caller_name = (claim.get('finderName') if is_finder else claim.get('claimerName')) or ('Finder' if is_finder else 'Claimant')
        caller_flag_name = 'finderHandoverConfirmed' if is_finder else 'claimantHandoverConfirmed'
        other_flag_name = 'claimantHandoverConfirmed' if is_finder else 'finderHandoverConfirmed'

        # Duplicate confirmation guard
        if claim.get(caller_flag_name) is True:
            return build_response(400, {
                'success': False,
                'error': f"You have already confirmed physical handover for this claim as the {caller_role}."
            })

        now_iso = datetime.now(timezone.utc).isoformat()
        other_party_already_confirmed = (claim.get(other_flag_name) is True)

        history_entry = {
            'id': f"h-{int(datetime.now(timezone.utc).timestamp() * 1000)}#{uuid.uuid4().hex[:6]}",
            'action': 'Finder Handover Confirmed' if is_finder else 'Claimant Receipt Confirmed',
            'performedBy': caller_name,
            'role': caller_role,
            'timestamp': now_iso,
            'comment': f"{caller_role.capitalize()} confirmed physical custody transfer.",
        }

        item_id = claim.get('itemId')

        if other_party_already_confirmed:
            # Dual confirmation complete!
            new_status = 'COMPLETED'
            completion_history_entry = {
                'id': f"h-{int(datetime.now(timezone.utc).timestamp() * 1000) + 1}#{uuid.uuid4().hex[:6]}",
                'action': 'Handover Completed',
                'performedBy': 'System',
                'role': 'system',
                'timestamp': now_iso,
                'comment': 'Handover confirmed by both parties. Item marked as Returned to Owner.',
            }
            updated_history = list(claim.get('history') or []) + [history_entry, completion_history_entry]

            activity_action_id = f"{now_iso}#HANDOVER_COMPLETED#{uuid.uuid4().hex}"
            activity_record = {
                'entityId': claim_id,
                'timestampActionId': activity_action_id,
                'action': 'HANDOVER_COMPLETED',
                'actorSub': sub,
                'actorName': caller_name,
                'actorRole': caller_role,
                'details': 'Dual handover confirmed. Property marked as Returned to Owner.',
                'previousStatus': current_status,
                'newStatus': 'COMPLETED',
                'timestamp': now_iso,
            }

            # Pre-check target item ownership
            try:
                item_res = items_table.get_item(Key={'itemId': item_id})
                item_rec = item_res.get('Item')
            except Exception as e:
                return build_response(500, {'success': False, 'error': f"Database error checking item: {str(e)}"})

            if not item_rec:
                return build_response(404, {'success': False, 'error': f"Associated item '{item_id}' not found."})

            if item_rec.get('activeClaimId') != claim_id or str(item_rec.get('status') or '').lower() != 'claimed':
                return build_response(409, {
                    'success': False,
                    'error': f"Conflict: Target item '{item_id}' is not currently active under this claim ID and cannot be marked returned."
                })

            try:
                dynamodb_client.transact_write_items(
                    TransactItems=[
                        {
                            'Update': {
                                'TableName': CLAIMS_TABLE_NAME,
                                'Key': {'claimId': {'S': claim_id}},
                                'UpdateExpression': 'SET #st = :comp_st, #f_conf = :true_val, #c_conf = :true_val, #h_at = :now, #hist = :hist, #up = :now',
                                'ConditionExpression': '#st IN (:st1, :st2) AND #call_conf = :false_val AND #oth_conf = :true_val',
                                'ExpressionAttributeNames': {
                                    '#st': 'status',
                                    '#f_conf': 'finderHandoverConfirmed',
                                    '#c_conf': 'claimantHandoverConfirmed',
                                    '#call_conf': caller_flag_name,
                                    '#oth_conf': other_flag_name,
                                    '#h_at': 'handoverCompletedAt',
                                    '#hist': 'history',
                                    '#up': 'updatedAt',
                                },
                                'ExpressionAttributeValues': {
                                    ':comp_st': {'S': 'COMPLETED'},
                                    ':true_val': {'BOOL': True},
                                    ':false_val': {'BOOL': False},
                                    ':now': {'S': now_iso},
                                    ':st1': {'S': 'ADMIN_APPROVED'},
                                    ':st2': {'S': 'HANDOVER_IN_PROGRESS'},
                                    ':hist': to_dynamo_value(updated_history),
                                }
                            }
                        },
                        {
                            'Update': {
                                'TableName': ITEMS_TABLE_NAME,
                                'Key': {'itemId': {'S': item_id}},
                                'UpdateExpression': 'SET #ist = :returned_st, #ret_at = :now, #up = :now',
                                'ConditionExpression': '#ist = :claimed_st AND #ac = :claim_id',
                                'ExpressionAttributeNames': {
                                    '#ist': 'status',
                                    '#ac': 'activeClaimId',
                                    '#ret_at': 'returnedAt',
                                    '#up': 'updatedAt',
                                },
                                'ExpressionAttributeValues': {
                                    ':claimed_st': {'S': 'claimed'},
                                    ':claim_id': {'S': claim_id},
                                    ':returned_st': {'S': 'returned'},
                                    ':now': {'S': now_iso},
                                }
                            }
                        },
                        {
                            'Put': {
                                'TableName': ACTIVITY_LOG_TABLE_NAME,
                                'Item': to_dynamo_item(activity_record),
                                'ConditionExpression': 'attribute_not_exists(timestampActionId)',
                            }
                        }
                    ]
                )
            except Exception as e:
                err_msg = str(e)
                if 'ConditionalCheckFailed' in err_msg or 'TransactionCanceledException' in err_msg:
                    # Retry fresh read to resolve race condition
                    continue
                return build_response(500, {'success': False, 'error': f"Failed to complete handover transaction: {err_msg}"})

            claim['status'] = 'COMPLETED'
            claim['finderHandoverConfirmed'] = True
            claim['claimantHandoverConfirmed'] = True
            claim['handoverCompletedAt'] = now_iso
            claim['history'] = updated_history
            claim['updatedAt'] = now_iso

            return build_response(200, {
                'success': True,
                'message': 'Handover completed successfully. Item marked as returned.',
                'claim': claim
            })

        else:
            # First party confirmation
            new_status = 'HANDOVER_IN_PROGRESS'
            updated_history = list(claim.get('history') or []) + [history_entry]

            activity_action_id = f"{now_iso}#HANDOVER_CONFIRMED#{uuid.uuid4().hex}"
            activity_record = {
                'entityId': claim_id,
                'timestampActionId': activity_action_id,
                'action': 'HANDOVER_CONFIRMED',
                'actorSub': sub,
                'actorName': caller_name,
                'actorRole': caller_role,
                'details': f"{caller_role.capitalize()} confirmed physical custody transfer.",
                'previousStatus': current_status,
                'newStatus': new_status,
                'timestamp': now_iso,
            }

            try:
                dynamodb_client.transact_write_items(
                    TransactItems=[
                        {
                            'Update': {
                                'TableName': CLAIMS_TABLE_NAME,
                                'Key': {'claimId': {'S': claim_id}},
                                'UpdateExpression': f"SET #st = :new_st, #{caller_flag_name} = :true_val, #hist = :hist, #up = :now",
                                'ConditionExpression': f"#st IN (:st1, :st2) AND #{caller_flag_name} = :false_val AND #{other_flag_name} = :false_val",
                                'ExpressionAttributeNames': {
                                    '#st': 'status',
                                    f"#{caller_flag_name}": caller_flag_name,
                                    f"#{other_flag_name}": other_flag_name,
                                    '#hist': 'history',
                                    '#up': 'updatedAt',
                                },
                                'ExpressionAttributeValues': {
                                    ':new_st': {'S': new_status},
                                    ':true_val': {'BOOL': True},
                                    ':false_val': {'BOOL': False},
                                    ':st1': {'S': 'ADMIN_APPROVED'},
                                    ':st2': {'S': 'HANDOVER_IN_PROGRESS'},
                                    ':hist': to_dynamo_value(updated_history),
                                    ':now': {'S': now_iso},
                                }
                            }
                        },
                        {
                            'Put': {
                                'TableName': ACTIVITY_LOG_TABLE_NAME,
                                'Item': to_dynamo_item(activity_record),
                                'ConditionExpression': 'attribute_not_exists(timestampActionId)',
                            }
                        }
                    ]
                )
            except Exception as e:
                err_msg = str(e)
                if 'ConditionalCheckFailed' in err_msg or 'TransactionCanceledException' in err_msg:
                    # Race condition detected: other party just confirmed concurrently; retry fresh to execute completion
                    continue
                return build_response(500, {'success': False, 'error': f"Failed to record handover confirmation: {err_msg}"})

            claim['status'] = new_status
            claim[caller_flag_name] = True
            claim['history'] = updated_history
            claim['updatedAt'] = now_iso

            return build_response(200, {
                'success': True,
                'message': f"Handover receipt recorded for {caller_role}. Waiting for other party confirmation.",
                'claim': claim
            })

    # Retries exhausted
    return build_response(409, {
        'success': False,
        'error': "Conflict: Handover update could not be completed due to high concurrency. Please retry."
    })

# -------------------------------------------------------------------------
# Lambda Main Entrypoint Router
# -------------------------------------------------------------------------
def lambda_handler(event, context):
    """
    Main Lambda router for FindIt-Backend.
    Dispatches based on normalized HTTP method and path.
    """
    method, path = extract_request_info(event)

    # 1. CORS Preflight
    if method == 'OPTIONS':
        return build_response(204, '')

    # 2. Public Health Check
    if method == 'GET' and path == '/health':
        return handle_health()

    # 3. Authenticated Current User Profile
    if method == 'GET' and path == '/users/me':
        return handle_users_me(event)

    # 4. Items Catalog (Public / Authenticated)
    if method == 'GET' and path == '/items':
        return handle_get_items(event)

    # 5. Item Reporting (Authenticated)
    if method == 'POST' and path == '/items':
        return handle_post_items(event)

    # 6. S3 Pre-Signed Upload URL (Authenticated)
    if method == 'POST' and path == '/uploads/presign':
        return handle_presign_upload(event)

    # 7. Claims List (Authenticated, Scoped)
    if method == 'GET' and path == '/claims':
        return handle_get_claims(event)

    # 8. Claim Creation (Authenticated)
    if method == 'POST' and path == '/claims':
        return handle_post_claims(event)

    # 9. Claim Parametric Routes: /claims/{claimId}[/{action}]
    claims_match = re.match(r'^/claims/([^/]+)(?:/(finder-decision|dispute|admin-decision|handover))?$', path)
    if claims_match:
        claim_id = claims_match.group(1)
        sub_action = claims_match.group(2)

        # GET /claims/{claimId}
        if method == 'GET' and not sub_action:
            return handle_get_claim_by_id(event, claim_id)

        # POST /claims/{claimId}/finder-decision
        if method == 'POST' and sub_action == 'finder-decision':
            return handle_finder_decision(event, claim_id)

        # POST /claims/{claimId}/dispute
        if method == 'POST' and sub_action == 'dispute':
            return handle_dispute(event, claim_id)

        # POST /claims/{claimId}/admin-decision
        if method == 'POST' and sub_action == 'admin-decision':
            return handle_admin_decision(event, claim_id)

        # POST /claims/{claimId}/handover
        if method == 'POST' and sub_action == 'handover':
            return handle_handover(event, claim_id)

    # Fallback 404 for unmapped routes
    return build_response(404, {
        'success': False,
        'error': f"Not Found: No route matches {method} {path}"
    })
