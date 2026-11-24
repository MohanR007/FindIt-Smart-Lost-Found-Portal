import { fetchAuthSession } from 'aws-amplify/auth';
import { API_BASE_URL } from '../config/awsConfig.js';

/**
 * Public health check endpoint
 * GET /health
 */
export async function getHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Health check returned status ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.error('API health check error:', err);
    throw new Error(`Health check failed: ${err.message}`);
  }
}

/**
 * Safely parse standard JWT token payload without external dependencies
 */
export function parseJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.warn('Could not parse JWT token payload:', e);
    return null;
  }
}

/**
 * Authenticated user profile retrieval from DynamoDB backend
 * GET /users/me
 * Sends Cognito ID token in Authorization: Bearer <ID_TOKEN>
 */
export async function getCurrentUserProfile(explicitToken = null) {
  let token = explicitToken;
  if (!token) {
    try {
      const session = await fetchAuthSession();
      token = session.tokens?.idToken?.toString();
    } catch (err) {
      console.warn('Could not retrieve active session for /users/me:', err);
    }
  }

  if (!token) {
    throw new Error('No authentication session token available. Please sign in.');
  }

  try {
    const res = await fetch(`${API_BASE_URL}/users/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (res.status === 401) {
      throw new Error('Your session has expired or is invalid. Please sign in again.');
    }
    if (res.status === 403) {
      throw new Error('Access forbidden: You do not have permission to access this resource.');
    }
    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      throw new Error(`Backend request failed with status ${res.status}: ${errorText || res.statusText}`);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message?.toLowerCase().includes('fetch')) {
      throw new Error('Network error: Unable to connect to the FindIt API Gateway backend.');
    }
    throw err;
  }
}

/**
 * Normalize backend DynamoDB response with Cognito claims.
 * Enforces server-determined roles: new users default to 'user',
 * administrative privilege requires explicit backend DynamoDB role or Cognito group.
 */
export function normalizeUserProfile(apiData, idToken) {
  const claims = idToken ? parseJwtPayload(idToken) : null;
  const groups = claims?.['cognito:groups'] || [];
  const isAdminGroup = Array.isArray(groups)
    ? groups.some((g) => g.toLowerCase() === 'admin')
    : typeof groups === 'string' && groups.toLowerCase() === 'admin';

  // Extract nested data payload if backend wraps in { user: ... } or { data: ... }
  const profile = (apiData && (apiData.user || apiData.data || apiData)) || {};

  // Server-determined role resolution
  let role = 'user';
  if (profile.role === 'admin' || isAdminGroup) {
    role = 'admin';
  } else if (profile.role) {
    role = profile.role;
  }

  const userId = profile.userId || profile.id || claims?.sub || `u-${Date.now()}`;
  const email = profile.email || claims?.email || '';
  const name = profile.name || profile.fullName || claims?.name || email.split('@')[0] || 'Verified Member';

  return {
    id: userId,
    sub: claims?.sub || userId,
    email,
    name,
    avatar: profile.avatar || null,
    role,
    joinedDate: profile.createdAt
      ? profile.createdAt.split('T')[0]
      : profile.joinedDate || new Date().toISOString().split('T')[0],
    _isRealCognito: true,
    _rawBackend: apiData || null,
  };
}

/**
 * Retrieve catalog items from FindIt backend
 * GET /items
 * Supports optional type, category, and search query parameters.
 * Parses backend response { success: true, items: [...] } and returns the items array.
 *
 * @param {Object} [params] - Optional query filters
 * @param {string} [params.type] - Classification filter ('lost' | 'found')
 * @param {string} [params.category] - Catalog category filter
 * @param {string} [params.search] - Search keyword for name, description, location, or tags
 * @returns {Promise<Array>} Array of item objects
 */
export async function fetchItems(params = {}) {
  try {
    const queryParams = new URLSearchParams();

    if (params && typeof params === 'object') {
      if (params.type && params.type !== 'all') {
        queryParams.set('type', params.type.toLowerCase().trim());
      }
      if (params.category && params.category !== 'All' && params.category !== 'all') {
        queryParams.set('category', params.category.trim());
      }
      if (params.search && typeof params.search === 'string' && params.search.trim()) {
        queryParams.set('search', params.search.trim());
      }
    } else if (typeof params === 'string' && params.trim()) {
      queryParams.set('search', params.trim());
    }

    const queryString = queryParams.toString();
    const url = queryString ? `${API_BASE_URL}/items?${queryString}` : `${API_BASE_URL}/items`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      throw new Error(`Failed to fetch items (${res.status}): ${errorText || res.statusText}`);
    }

    const data = await res.json();
    if (data && Array.isArray(data.items)) {
      return data.items;
    }
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  } catch (err) {
    if (err.name === 'TypeError' && err.message?.toLowerCase().includes('fetch')) {
      throw new Error('Network error: Unable to connect to the FindIt API Gateway backend.');
    }
    console.error('fetchItems error:', err);
    throw err;
  }
}

/**
 * Upload an image file directly to the private S3 bucket using pre-signed PUT URL.
 * 1. Obtains the Cognito ID token via AWS Amplify fetchAuthSession().
 * 2. Calls POST /uploads/presign with fileName and contentType.
 * 3. Uploads the raw binary directly to S3 using HTTP PUT with matching Content-Type.
 * 4. Returns the permanent S3 imageKey (never the temporary pre-signed URL).
 *
 * @param {File|Blob} file - Browser File or Blob object to upload
 * @returns {Promise<string>} The permanent S3 object key (e.g. "uploads/{sub}/{uuid}.jpg")
 */
export async function uploadItemImage(file) {
  if (!file) {
    throw new Error('No image file provided for upload.');
  }

  // Normalize and validate MIME type
  let rawType = (file.type || '').toLowerCase().trim();
  if (!rawType && file.name) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'jpg' || ext === 'jpeg') rawType = 'image/jpeg';
    else if (ext === 'png') rawType = 'image/png';
    else if (ext === 'webp') rawType = 'image/webp';
  }

  const contentType = rawType === 'image/jpg' ? 'image/jpeg' : rawType;
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

  if (!allowedMimeTypes.includes(contentType)) {
    throw new Error('Unsupported file type. Please upload a JPEG, PNG, or WebP image.');
  }

  // Obtain current Cognito ID token from Amplify session
  let token = null;
  try {
    const session = await fetchAuthSession();
    token = session.tokens?.idToken?.toString();
  } catch (err) {
    console.warn('Could not retrieve active session for uploadItemImage:', err);
  }

  if (!token) {
    throw new Error('Authentication required: Please sign in before uploading an image.');
  }

  try {
    // 1. Request pre-signed PUT URL from backend
    const presignRes = await fetch(`${API_BASE_URL}/uploads/presign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        fileName: file.name || 'image',
        contentType,
      }),
    });

    if (presignRes.status === 401) {
      throw new Error('Your session has expired or is invalid. Please sign in again.');
    }
    if (presignRes.status === 403) {
      throw new Error('Access forbidden: You do not have permission to upload files.');
    }

    const presignData = await presignRes.json().catch(() => null);
    if (!presignRes.ok) {
      const errorMsg =
        presignData?.error ||
        presignData?.message ||
        `Failed to generate upload URL (status ${presignRes.status})`;
      throw new Error(errorMsg);
    }

    const { uploadUrl, imageKey } = presignData || {};
    if (!uploadUrl || !imageKey) {
      throw new Error('Server returned an invalid pre-signed upload URL response.');
    }

    // 2. Direct binary upload to private S3 bucket using pre-signed PUT URL
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
      body: file,
    });

    if (!uploadRes.ok) {
      if (uploadRes.status === 403) {
        throw new Error('The upload link has expired or access was denied. Please try again.');
      }
      throw new Error(`Direct image upload to S3 failed with status ${uploadRes.status}: ${uploadRes.statusText}`);
    }

    // Return the permanent S3 object key (never the temporary pre-signed URL)
    return imageKey;
  } catch (err) {
    if (err.name === 'TypeError' && err.message?.toLowerCase().includes('fetch')) {
      throw new Error('Network error: Unable to connect to the FindIt storage service.');
    }
    console.error('uploadItemImage error:', err);
    throw err;
  }
}

/**
 * Report a lost or found item to FindIt backend
 * POST /items
 * Requires authenticated Cognito ID token (obtained via fetchAuthSession)
 * Sends type, name, category, description, location, date, tags, and optional imageKey.
 * Rejects Base64 image payloads to protect DynamoDB item size limits.
 *
 * @param {Object} itemData - Item details to submit
 * @param {string} itemData.type - 'lost' or 'found'
 * @param {string} itemData.name - Title of the item
 * @param {string} itemData.category - Catalog category
 * @param {string} itemData.description - Detailed description
 * @param {string} itemData.location - Campus location
 * @param {string} itemData.date - Incident date (YYYY-MM-DD)
 * @param {Array<string>|string} [itemData.tags] - Array of tags or comma-separated string
 * @param {string} [itemData.imageKey] - Permanent S3 object key (e.g. "uploads/{sub}/{uuid}.jpg")
 * @param {string} [itemData.image] - HTTPS URL for primary image (never Base64)
 * @param {Array<string>} [itemData.images] - Array of HTTPS image URLs (never Base64)
 * @returns {Promise<Object>} Created item record from backend
 */
export async function createItem(itemData) {
  if (!itemData || typeof itemData !== 'object') {
    throw new Error('Invalid item data provided.');
  }

  // Obtain current Cognito ID token from Amplify session
  let token = null;
  try {
    const session = await fetchAuthSession();
    token = session.tokens?.idToken?.toString();
  } catch (err) {
    console.warn('Could not retrieve active session for createItem:', err);
  }

  if (!token) {
    throw new Error('Authentication required: Please sign in before reporting an item.');
  }

  // Normalize tags to an array of lowercase strings
  let tags = [];
  if (Array.isArray(itemData.tags)) {
    tags = itemData.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean);
  } else if (typeof itemData.tags === 'string' && itemData.tags.trim()) {
    tags = itemData.tags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
  }

  // Validate and construct payload
  // Base64 image data is strictly excluded to prevent DynamoDB 400KB limit errors
  const payload = {
    type: itemData.type ? String(itemData.type).trim().toLowerCase() : '',
    name: itemData.name ? String(itemData.name).trim() : '',
    category: itemData.category ? String(itemData.category).trim() : '',
    description: itemData.description ? String(itemData.description).trim() : '',
    location: itemData.location ? String(itemData.location).trim() : '',
    date: itemData.date ? String(itemData.date).trim() : '',
    tags,
  };

  // Include verified S3 imageKey when provided
  if (itemData.imageKey && typeof itemData.imageKey === 'string' && itemData.imageKey.trim()) {
    payload.imageKey = itemData.imageKey.trim();
  }

  // Only pass standard HTTPS image URLs, never Base64 data URIs
  if (
    itemData.image &&
    typeof itemData.image === 'string' &&
    !itemData.image.startsWith('data:image/') &&
    itemData.image.startsWith('http')
  ) {
    payload.image = itemData.image.trim();
  }

  if (Array.isArray(itemData.images)) {
    const safeImages = itemData.images.filter(
      (img) => typeof img === 'string' && !img.startsWith('data:image/') && img.startsWith('http')
    );
    if (safeImages.length > 0) {
      payload.images = safeImages;
    }
  }

  try {
    const res = await fetch(`${API_BASE_URL}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (res.status === 401) {
      throw new Error('Your session has expired or is invalid. Please sign in again.');
    }
    if (res.status === 403) {
      throw new Error('Access forbidden: You do not have permission to report items.');
    }

    const responseData = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg =
        responseData?.error ||
        responseData?.message ||
        `Backend rejected item creation with status ${res.status}: ${res.statusText}`;
      throw new Error(errorMsg);
    }

    return responseData?.item || responseData;
  } catch (err) {
    if (err.name === 'TypeError' && err.message?.toLowerCase().includes('fetch')) {
      throw new Error('Network error: Unable to connect to the FindIt API Gateway backend.');
    }
    console.error('createItem error:', err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Claims API Integration (Real AWS Claims Backend)
// ---------------------------------------------------------------------------

/**
 * Internal helper to retrieve the active Cognito ID token via AWS Amplify Auth v6.
 * Throws a clear error if no session is active.
 *
 * @param {string} [explicitToken] - Optional pre-fetched Cognito ID token
 * @returns {Promise<string>} The Cognito ID token string
 */
async function getAuthToken(explicitToken = null) {
  let token = explicitToken;
  if (!token) {
    try {
      const session = await fetchAuthSession();
      token = session.tokens?.idToken?.toString();
    } catch (err) {
      console.warn('Could not retrieve active session for claims request:', err);
    }
  }

  if (!token) {
    throw new Error('Authentication required: Please sign in before performing this action.');
  }

  return token;
}

/**
 * Internal helper to format informative error messages from backend responses.
 *
 * @param {Response} res - Fetch Response object
 * @param {Object|null} responseData - Parsed JSON body if available
 * @param {string} defaultMessage - Fallback error description
 * @returns {Error} Formatted Error instance
 */
function createApiError(res, responseData, defaultMessage) {
  const serverMsg = responseData?.error || responseData?.message;

  if (res.status === 400) {
    return new Error(serverMsg || defaultMessage || 'Validation error: The request was rejected by the server.');
  }
  if (res.status === 401) {
    return new Error('Your session has expired or is invalid. Please sign in again.');
  }
  if (res.status === 403) {
    return new Error(serverMsg || 'Access forbidden: You do not have permission to perform this action.');
  }
  if (res.status === 404) {
    return new Error(serverMsg || 'The requested claim or record was not found.');
  }
  if (res.status === 409) {
    return new Error(
      serverMsg || 'Conflict: The claim or target item was updated concurrently by another operation. Please refresh and try again.'
    );
  }

  return new Error(serverMsg || defaultMessage || `Server returned status ${res.status}: ${res.statusText}`);
}

/**
 * 1. Retrieve claims list from FindIt backend with optional role scoping and pagination
 * GET /claims
 * Requires authenticated Cognito ID token.
 *
 * @param {Object} [params] - Query options
 * @param {string} [params.role] - Scoping filter: 'claimant' | 'finder' | 'all'
 * @param {string} [params.status] - Status filter (e.g. 'PENDING_ADMIN_REVIEW')
 * @param {string} [params.itemId] - Filter claims for a specific item ID
 * @param {number|string} [params.limit] - Page limit (1-100)
 * @param {string|number} [params.cursor] - Offset pagination cursor
 * @param {string|number} [params.nextToken] - Alias for cursor
 * @returns {Promise<Array<Object> & { total: number, nextCursor: string|null, limit: number, offset: number, claims: Array<Object> }>} Array of claim records with pagination metadata
 */
export async function fetchClaims(params = {}, explicitToken = null) {
  const token = await getAuthToken(explicitToken || (params && params.token));

  const queryParams = new URLSearchParams();
  if (params && typeof params === 'object') {
    if (params.role && params.role !== 'all') {
      queryParams.set('role', String(params.role).trim().toLowerCase());
    }
    if (params.status && params.status !== 'all') {
      queryParams.set('status', String(params.status).trim());
    }
    if (params.itemId && String(params.itemId).trim()) {
      queryParams.set('itemId', String(params.itemId).trim());
    }
    if (params.limit !== undefined && params.limit !== null && String(params.limit).trim() !== '') {
      queryParams.set('limit', String(params.limit).trim());
    }
    const cursor = params.cursor ?? params.nextToken;
    if (cursor !== undefined && cursor !== null && String(cursor).trim() !== '') {
      queryParams.set('cursor', String(cursor).trim());
    }
  }

  const qs = queryParams.toString();
  const url = qs ? `${API_BASE_URL}/claims?${qs}` : `${API_BASE_URL}/claims`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    const responseData = await res.json().catch(() => null);

    if (!res.ok) {
      throw createApiError(res, responseData, 'Failed to fetch claims list.');
    }

    const claimsList = Array.isArray(responseData?.claims)
      ? responseData.claims
      : (Array.isArray(responseData) ? responseData : []);

    // Attach pagination metadata directly to array while preserving array ergonomics
    claimsList.total = responseData?.total ?? claimsList.length;
    claimsList.nextCursor = responseData?.nextCursor ?? null;
    claimsList.limit = responseData?.limit ?? claimsList.length;
    claimsList.offset = responseData?.offset ?? 0;
    claimsList.claims = claimsList;

    return claimsList;
  } catch (err) {
    if (err.name === 'TypeError' && err.message?.toLowerCase().includes('fetch')) {
      throw new Error('Network error: Unable to connect to the FindIt claims service.');
    }
    console.error('fetchClaims error:', err.message);
    throw err;
  }
}

/**
 * 2. Retrieve a single claim record and audit trail by ID
 * GET /claims/{claimId}
 * Requires authenticated Cognito ID token. Caller must be claimant, finder, or administrator.
 *
 * @param {string} claimId - Unique ID of the claim to retrieve
 * @returns {Promise<Object>} Claim details and workflow history
 */
export async function fetchClaimById(claimId, explicitToken = null) {
  if (!claimId || typeof claimId !== 'string' || !claimId.trim()) {
    throw new Error('Validation error: A valid claim ID is required.');
  }

  const token = await getAuthToken(explicitToken);
  const safeClaimId = encodeURIComponent(claimId.trim());

  try {
    const res = await fetch(`${API_BASE_URL}/claims/${safeClaimId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    const responseData = await res.json().catch(() => null);

    if (!res.ok) {
      throw createApiError(res, responseData, `Failed to fetch claim '${claimId}'.`);
    }

    return responseData?.claim || responseData;
  } catch (err) {
    if (err.name === 'TypeError' && err.message?.toLowerCase().includes('fetch')) {
      throw new Error('Network error: Unable to connect to the FindIt claims service.');
    }
    console.error(`fetchClaimById error for ${claimId}:`, err.message);
    throw err;
  }
}

/**
 * 3. Submit a new ownership claim against a found item
 * POST /claims
 * Requires authenticated Cognito ID token.
 * Claimant identity is securely extracted from JWT claims by the backend.
 *
 * @param {Object} claimData - Claim application details
 * @param {string} claimData.itemId - Identifier of the found item being claimed
 * @param {string} claimData.reason - Grounds/justification for ownership (min 10 characters)
 * @param {string} claimData.verificationDetails - Private proof/identifiers (min 10 characters)
 * @param {string} [claimData.additionalInfo] - Optional supplemental details
 * @returns {Promise<Object>} Created claim record with initial history
 */
export async function createClaim(claimData, explicitToken = null) {
  if (!claimData || typeof claimData !== 'object') {
    throw new Error('Validation error: Claim data must be provided as an object.');
  }

  const itemId = String(claimData.itemId || '').trim();
  const reason = String(claimData.reason || '').trim();
  const verificationDetails = String(claimData.verificationDetails || '').trim();
  const additionalInfo = String(claimData.additionalInfo || '').trim();

  if (!itemId) {
    throw new Error("Validation error: 'itemId' is required to file a claim.");
  }
  if (!reason || reason.length < 10) {
    throw new Error("Validation error: 'reason' is required and must be at least 10 characters.");
  }
  if (!verificationDetails || verificationDetails.length < 10) {
    throw new Error("Validation error: 'verificationDetails' is required and must be at least 10 characters.");
  }

  const token = await getAuthToken(explicitToken || claimData.token);

  // Construct secure payload: never send frontend-supplied userId, role, or claimerName as authoritative
  const payload = {
    itemId,
    reason,
    verificationDetails,
    additionalInfo,
  };

  try {
    const res = await fetch(`${API_BASE_URL}/claims`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseData = await res.json().catch(() => null);

    if (!res.ok) {
      throw createApiError(res, responseData, 'Failed to submit ownership claim.');
    }

    return responseData?.claim || responseData;
  } catch (err) {
    if (err.name === 'TypeError' && err.message?.toLowerCase().includes('fetch')) {
      throw new Error('Network error: Unable to connect to the FindIt claims service.');
    }
    // Protect private verification details from leaking into frontend logs
    console.error(`createClaim error for itemId ${itemId}:`, err.message);
    throw err;
  }
}

/**
 * 4. Submit finder evaluation decision on a pending claim
 * POST /claims/{claimId}/finder-decision
 * Requires authenticated Cognito ID token. Caller must be the original finder.
 *
 * @param {string} claimId - Unique ID of the claim to review
 * @param {Object|string} decisionData - Decision configuration object or 'approve'|'reject' string
 * @param {string} [decisionData.decision] - 'approve' | 'reject'
 * @param {string} [decisionData.rejectionReason] - Mandatory explanation if rejecting (min 5 chars)
 * @param {string} [decisionData.comment] - Optional note if approving, or alternative for rejectionReason
 * @param {string} [maybeRejectionReason] - Used if decisionData is passed as string 'reject'
 * @param {string} [maybeComment] - Used if decisionData is passed as string 'approve'
 * @returns {Promise<Object>} Updated claim record
 */
export async function submitFinderDecision(claimId, decisionData, maybeRejectionReason, maybeComment, explicitToken = null) {
  if (!claimId || typeof claimId !== 'string' || !claimId.trim()) {
    throw new Error('Validation error: A valid claim ID is required.');
  }

  let decision = '';
  let rejectionReason = '';
  let comment = '';

  if (typeof decisionData === 'string') {
    decision = decisionData.trim().toLowerCase();
    rejectionReason = String(maybeRejectionReason || '').trim();
    comment = String(maybeComment || maybeRejectionReason || '').trim();
  } else if (decisionData && typeof decisionData === 'object') {
    decision = String(decisionData.decision || '').trim().toLowerCase();
    rejectionReason = String(decisionData.rejectionReason || decisionData.comment || '').trim();
    comment = String(decisionData.comment || '').trim();
  }

  if (decision !== 'approve' && decision !== 'reject') {
    throw new Error("Validation error: 'decision' must be either 'approve' or 'reject'.");
  }

  if (decision === 'reject' && (!rejectionReason || rejectionReason.length < 5)) {
    throw new Error("Validation error: A substantive rejection reason (at least 5 characters) is required when rejecting a claim.");
  }

  const payload = { decision };
  if (decision === 'reject') {
    payload.rejectionReason = rejectionReason;
  }
  if (comment) {
    payload.comment = comment;
  }

  const token = await getAuthToken(explicitToken || (decisionData && decisionData.token));
  const safeClaimId = encodeURIComponent(claimId.trim());

  try {
    const res = await fetch(`${API_BASE_URL}/claims/${safeClaimId}/finder-decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseData = await res.json().catch(() => null);

    if (!res.ok) {
      throw createApiError(res, responseData, 'Failed to record finder decision.');
    }

    return responseData?.claim || responseData;
  } catch (err) {
    if (err.name === 'TypeError' && err.message?.toLowerCase().includes('fetch')) {
      throw new Error('Network error: Unable to connect to the FindIt claims service.');
    }
    console.error(`submitFinderDecision error for ${claimId}:`, err.message);
    throw err;
  }
}

/**
 * 5. Submit an administrative dispute appeal after a finder rejection
 * POST /claims/{claimId}/dispute
 * Requires authenticated Cognito ID token. Caller must be the claimant.
 *
 * @param {string} claimId - Unique ID of the rejected claim
 * @param {string|Object} disputeData - Explanation statement string or { disputeReason: string }
 * @returns {Promise<Object>} Updated claim record moved to ADMIN_REVIEW_REQUESTED
 */
export async function submitClaimDispute(claimId, disputeData, explicitToken = null) {
  if (!claimId || typeof claimId !== 'string' || !claimId.trim()) {
    throw new Error('Validation error: A valid claim ID is required.');
  }

  let disputeReason = '';
  if (typeof disputeData === 'string') {
    disputeReason = disputeData.trim();
  } else if (disputeData && typeof disputeData === 'object') {
    disputeReason = String(disputeData.disputeReason || disputeData.comment || '').trim();
  }

  if (!disputeReason || disputeReason.length < 10) {
    throw new Error("Validation error: Field 'disputeReason' is required and must be at least 10 characters.");
  }

  const token = await getAuthToken(explicitToken || (disputeData && disputeData.token));
  const safeClaimId = encodeURIComponent(claimId.trim());

  try {
    const res = await fetch(`${API_BASE_URL}/claims/${safeClaimId}/dispute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify({ disputeReason }),
    });

    const responseData = await res.json().catch(() => null);

    if (!res.ok) {
      throw createApiError(res, responseData, 'Failed to submit claim dispute.');
    }

    return responseData?.claim || responseData;
  } catch (err) {
    if (err.name === 'TypeError' && err.message?.toLowerCase().includes('fetch')) {
      throw new Error('Network error: Unable to connect to the FindIt claims service.');
    }
    console.error(`submitClaimDispute error for ${claimId}:`, err.message);
    throw err;
  }
}

/**
 * 6. Adjudicate a claim by campus administrator
 * POST /claims/{claimId}/admin-decision
 * Requires authenticated Cognito ID token with administrative credentials.
 *
 * @param {string} claimId - Unique ID of the claim under review
 * @param {Object|string} decisionData - Decision configuration object or 'approve'|'reject' string
 * @param {string} [decisionData.decision] - 'approve' | 'reject'
 * @param {string} [decisionData.comment] - Mandatory administrative evaluation rationale (min 5 chars)
 * @param {string} [maybeComment] - Used if decisionData is passed as string 'approve'|'reject'
 * @returns {Promise<Object>} Updated claim record
 */
export async function submitAdminDecision(claimId, decisionData, maybeComment, explicitToken = null) {
  if (!claimId || typeof claimId !== 'string' || !claimId.trim()) {
    throw new Error('Validation error: A valid claim ID is required.');
  }

  let decision = '';
  let comment = '';

  if (typeof decisionData === 'string') {
    decision = decisionData.trim().toLowerCase();
    comment = String(maybeComment || '').trim();
  } else if (decisionData && typeof decisionData === 'object') {
    decision = String(decisionData.decision || '').trim().toLowerCase();
    comment = String(decisionData.comment || decisionData.adminComment || '').trim();
  }

  if (decision !== 'approve' && decision !== 'reject') {
    throw new Error("Validation error: 'decision' must be either 'approve' or 'reject'.");
  }

  if (!comment || comment.length < 5) {
    throw new Error("Validation error: Administrative evaluation requires a documented review rationale (at least 5 characters).");
  }

  const token = await getAuthToken(explicitToken || (decisionData && decisionData.token));
  const safeClaimId = encodeURIComponent(claimId.trim());

  try {
    const res = await fetch(`${API_BASE_URL}/claims/${safeClaimId}/admin-decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify({ decision, comment }),
    });

    const responseData = await res.json().catch(() => null);

    if (!res.ok) {
      throw createApiError(res, responseData, 'Failed to record administrative decision.');
    }

    return responseData?.claim || responseData;
  } catch (err) {
    if (err.name === 'TypeError' && err.message?.toLowerCase().includes('fetch')) {
      throw new Error('Network error: Unable to connect to the FindIt claims service.');
    }
    console.error(`submitAdminDecision error for ${claimId}:`, err.message);
    throw err;
  }
}

/**
 * 7. Confirm physical custody transfer (handover) of a claimed item
 * POST /claims/{claimId}/handover
 * Requires authenticated Cognito ID token. Caller must be claimant or finder.
 *
 * @param {string} claimId - Unique ID of the claim being handed over
 * @returns {Promise<Object>} Updated claim record (status HANDOVER_IN_PROGRESS or COMPLETED)
 */
export async function confirmHandover(claimId, explicitToken = null) {
  if (!claimId || typeof claimId !== 'string' || !claimId.trim()) {
    throw new Error('Validation error: A valid claim ID is required.');
  }

  const token = await getAuthToken(explicitToken);
  const safeClaimId = encodeURIComponent(claimId.trim());

  try {
    const res = await fetch(`${API_BASE_URL}/claims/${safeClaimId}/handover`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const responseData = await res.json().catch(() => null);

    if (!res.ok) {
      throw createApiError(res, responseData, 'Failed to record handover confirmation.');
    }

    return responseData?.claim || responseData;
  } catch (err) {
    if (err.name === 'TypeError' && err.message?.toLowerCase().includes('fetch')) {
      throw new Error('Network error: Unable to connect to the FindIt claims service.');
    }
    console.error(`confirmHandover error for ${claimId}:`, err.message);
    throw err;
  }
}

// Convenient function aliases for flexible consumer integration
export {
  fetchClaimById as getClaimById,
  createClaim as submitClaim,
  submitFinderDecision as recordFinderDecision,
  submitClaimDispute as disputeClaim,
  submitClaimDispute as requestAdminReview,
  submitAdminDecision as recordAdminDecision,
  confirmHandover as confirmClaimHandover,
};
