# FindIt – Cloud Backend Setup & Connection Guide

This guide provides step-by-step instructions to deploy, configure, and connect the **AWS Serverless Cloud Backend** to the **FindIt** frontend.

The backend is built with:
- **AWS Cognito**: User authentication, verification codes, and JWT sessions.
- **Amazon DynamoDB**: 4 serverless NoSQL tables for catalog items, claims, users, and audit logs.
- **Amazon S3**: Private, encrypted media storage with Pre-Signed PUT and GET URLs.
- **AWS Lambda**: Python 3.12 / 3.13 handler implementing atomic transactions and role authorization.
- **AWS API Gateway**: HTTP API (v2) with CORS and route proxying.
- **Target AWS Region**: `ap-southeast-2` (Sydney) or your preferred region.

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│                   FindIt Frontend                      │
│        (React 19 + Vite + AWS Amplify Auth)            │
└───────────────┬────────────────────────┬───────────────┘
                │                        │
       (1) Sign in / JWT         (2) REST API Calls
                ▼                        ▼
┌────────────────────────┐      ┌────────────────────────┐
│    Amazon Cognito      │      │  AWS API Gateway v2    │
│  (Student & Admin SSO) │      │      ($default)        │
└────────────────────────┘      └───────────┬────────────┘
                                            │
                                            ▼
                                ┌────────────────────────┐
                                │    AWS Lambda (Py 3.13)│
                                │   FindIt-Backend       │
                                └───┬────────────┬───────┘
                                    │            │
                    (3) DynamoDB Ops│            │ (4) Pre-Signed URLs
                                    ▼            ▼
                   ┌───────────────────┐      ┌─────────────────┐
                   │  Amazon DynamoDB  │      │    Amazon S3    │
                   │  (4 NoSQL Tables) │      │ (Private Bucket)│
                   └───────────────────┘      └─────────────────┘
```

---

## Step 1: Create Amazon Cognito User Pool

1. Log in to the [AWS Management Console](https://console.aws.amazon.com/) and navigate to **Amazon Cognito**.
2. Click **Create user pool**.
3. **Configure sign-in experience**:
   - Select **Email** as the sign-in identifier.
4. **Configure security requirements**:
   - Password policy: Minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number, and 1 symbol.
   - Multi-factor authentication (MFA): **Optional** or **No MFA** (recommended for dev/demo).
   - User account recovery: Select **Email only**.
5. **Configure sign-up experience**:
   - Keep self-registration enabled.
   - Verification message: Select **Send email message, verify email address**.
6. **Configure message delivery**:
   - Email provider: Select **Send email with Cognito** (sufficient for testing/development).
7. **Integrate your app**:
   - User pool name: `FindIt-UserPool`
   - Initial app client:
     - App type: **Public client**
     - App client name: `FindIt-Web-Client`
     - Client secret: **Don't generate a client secret** *(critical: browser clients cannot hold secrets)*.
8. Review and click **Create user pool**.
9. **Save your credentials**:
   - Copy the **User pool ID** (e.g. `ap-southeast-2_S5pPLxsCM`).
   - Open the **App integration** tab, scroll to **App clients and analytics**, and copy the **Client ID** (e.g. `fdnptc6suj6fjjpksjalmsp60`).

---

## Step 2: Create Amazon DynamoDB Tables

Navigate to **Amazon DynamoDB** &rarr; **Tables** &rarr; **Create table**. Create each of the following 4 tables using **On-Demand (Pay-per-request)** capacity:

| Table Name | Partition Key (PK) | Data Type | Sort Key | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **`FindIt-Items`** | `itemId` | String (`S`) | *None* | Active catalog listings (lost & found reports, locations, status) |
| **`FindIt-Claims`** | `claimId` | String (`S`) | *None* | Custody claims, confidential verification proof, and approval history |
| **`FindIt-Users`** | `userId` | String (`S`) | *None* | User profiles, full names, emails, and roles (`user` or `admin`) |
| **`FindIt-ActivityLog`** | `logId` | String (`S`) | *None* | Auditable timeline of all handover and status mutations |

> **Note**: Table names are case-sensitive and must match the Lambda environment variables.

---

## Step 3: Create Private Amazon S3 Bucket for Media

Item images are uploaded directly from the browser to Amazon S3 via secure, short-lived Pre-Signed URLs.

1. Navigate to **Amazon S3** &rarr; **Create bucket**.
2. **Bucket details**:
   - Bucket name: `findit-item-images-<your-unique-suffix>` (e.g. `findit-item-images-2026-campus`).
   - Region: `ap-southeast-2` (Sydney).
3. **Block Public Access settings**:
   - Keep **Block all public access** enabled *(images are securely served through signed GET URLs)*.
4. **Bucket Encryption**:
   - Select **Amazon S3-managed keys (SSE-S3)**.
5. Click **Create bucket**.
6. **Configure CORS**:
   - Select the newly created bucket &rarr; **Permissions** tab.
   - Scroll down to **Cross-origin resource sharing (CORS)** &rarr; click **Edit**.
   - Paste the following JSON:
     ```json
     [
       {
         "AllowedHeaders": ["*"],
         "AllowedMethods": ["GET", "PUT", "HEAD"],
         "AllowedOrigins": [
           "http://localhost:5173",
           "http://localhost:5174",
           "https://*"
         ],
         "ExposeHeaders": ["ETag"],
         "MaxAgeSeconds": 3000
       }
     ]
     ```
   - Click **Save changes**.

---

## Step 4: Create IAM Role for AWS Lambda

1. Navigate to **IAM** &rarr; **Roles** &rarr; **Create role**.
2. Trusted entity type: **AWS service** &rarr; Use case: **Lambda**.
3. Click **Next**.
4. Attach the following managed policy:
   - `AWSLambdaBasicExecutionRole`
5. Click **Next** &rarr; Role name: `FindIt-Lambda-ExecutionRole`.
6. Click **Create role**.
7. Open the newly created `FindIt-Lambda-ExecutionRole` &rarr; click **Add permissions** &rarr; **Create inline policy**.
8. Switch to the **JSON** editor and paste the policy below (replace `<YOUR_ACCOUNT_ID>` and `<YOUR_S3_BUCKET_NAME>`):
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "DynamoDBAccess",
         "Effect": "Allow",
         "Action": [
           "dynamodb:GetItem",
           "dynamodb:PutItem",
           "dynamodb:UpdateItem",
           "dynamodb:DeleteItem",
           "dynamodb:Scan",
           "dynamodb:Query",
           "dynamodb:DescribeTable"
         ],
         "Resource": [
           "arn:aws:dynamodb:*:*:table/FindIt-Items",
           "arn:aws:dynamodb:*:*:table/FindIt-Claims",
           "arn:aws:dynamodb:*:*:table/FindIt-Users",
           "arn:aws:dynamodb:*:*:table/FindIt-ActivityLog"
         ]
       },
       {
         "Sid": "S3PresignedAccess",
         "Effect": "Allow",
         "Action": [
           "s3:PutObject",
           "s3:GetObject"
         ],
         "Resource": "arn:aws:s3:::<YOUR_S3_BUCKET_NAME>/*"
       }
     ]
   }
   ```
9. Name the policy `FindIt-Backend-Policy` and click **Create policy**.

---

## Step 5: Deploy AWS Lambda Function

1. Navigate to **AWS Lambda** &rarr; **Create function**.
2. **Configuration**:
   - Function name: `FindIt-Backend`
   - Runtime: **Python 3.13** (or **Python 3.12**)
   - Architecture: **x86_64**
   - Execution role: Select **Use an existing role** &rarr; select `FindIt-Lambda-ExecutionRole`.
3. Click **Create function**.
4. **Deploy Code**:
   - Open the **Code** tab.
   - Replace the default code with the contents of [`aws/lambda/lambda_function.py`](file:///c:/Users/mohan/Downloads/findit/aws/lambda/lambda_function.py).
   - Click **Deploy**.
5. **Runtime Settings**:
   - Verify that the **Handler** is set to `lambda_function.lambda_handler`.
6. **General Configuration**:
   - Open **Configuration** &rarr; **General configuration** &rarr; **Edit**:
     - Memory: `256 MB`
     - Timeout: `15 seconds`
   - Click **Save**.
7. **Environment Variables**:
   - Open **Configuration** &rarr; **Environment variables** &rarr; **Edit**.
   - Add the following keys:

     | Key | Value |
     | :--- | :--- |
     | `AWS_REGION` | `ap-southeast-2` |
     | `ITEMS_TABLE` | `FindIt-Items` |
     | `USERS_TABLE` | `FindIt-Users` |
     | `CLAIMS_TABLE` | `FindIt-Claims` |
     | `ACTIVITY_LOG_TABLE` | `FindIt-ActivityLog` |
     | `S3_BUCKET` | `<YOUR_S3_BUCKET_NAME>` |

   - Click **Save**.

---

## Step 6: Create AWS API Gateway (HTTP API)

1. Navigate to **API Gateway** &rarr; click **Create API**.
2. Under **HTTP API**, click **Build**.
3. **Configure API**:
   - API name: `FindIt-API`
   - Click **Add integration** &rarr; select **Lambda**.
   - Select your region (`ap-southeast-2`) and choose `FindIt-Backend`.
   - Click **Next**.
4. **Configure Routes**:
   - Resource path: `$default`
   - Method: `ANY`
   - Integration target: `FindIt-Backend`
   - Click **Next**.
5. **Configure Stages**:
   - Keep stage name: `$default`
   - Ensure **Auto-deploy** is **Enabled**.
   - Click **Next** &rarr; click **Create**.
6. **Configure CORS**:
   - In the left sidebar under `FindIt-API`, click **CORS**.
   - Click **Configure**:
     - Access-Control-Allow-Origin: `*` *(or specific frontend origins like `http://localhost:5173`)*
     - Access-Control-Allow-Headers: `authorization, content-type, accept`
     - Access-Control-Allow-Methods: `GET, POST, PUT, DELETE, OPTIONS, HEAD`
     - Access-Control-Max-Age: `300`
   - Click **Save**.
7. **Copy API Endpoint**:
   - Copy the **Invoke URL** from the API details page (e.g. `https://jprd76umd9.execute-api.ap-southeast-2.amazonaws.com`).

---

## Step 7: Connect the Frontend to Your Cloud Backend

Now that your AWS services are running, configure the FindIt frontend to connect to them.

1. In your local `findit` repository root, create or edit `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Populate `.env.local` with your AWS credentials:
   ```ini
   # AWS Region
   VITE_AWS_REGION=ap-southeast-2

   # AWS Cognito Credentials from Step 1
   VITE_COGNITO_USER_POOL_ID=ap-southeast-2_S5pPLxsCM
   VITE_COGNITO_CLIENT_ID=fdnptc6suj6fjjpksjalmsp60

   # AWS API Gateway Endpoint from Step 6 (no trailing slash)
   VITE_API_BASE_URL=https://jprd76umd9.execute-api.ap-southeast-2.amazonaws.com
   ```
3. Start the local development server:
   ```bash
   npm run dev
   ```

---

## Step 8: Verify End-to-End Cloud Integration

Verify that all cloud services are communicating properly:

### 1. Health Check
Open your browser and navigate to:
```
https://<YOUR_API_ID>.execute-api.ap-southeast-2.amazonaws.com/health
```
You should receive a `200 OK` JSON response:
```json
{
  "status": "healthy",
  "service": "FindIt-Backend",
  "region": "ap-southeast-2"
}
```

### 2. User Authentication (Cognito)
1. Navigate to `http://localhost:5173/register`.
2. Register a new user with a valid email and password.
3. Check your email for the 6-digit confirmation code.
4. Enter the verification code in the FindIt verification modal.
5. Log in. Check the browser developer tools network tab &rarr; confirm that `GET /users/me` succeeds with `Authorization: Bearer <ID_TOKEN>`.

### 3. Creating an Admin Account
To grant administrative privileges to a user:
1. Open the **Amazon DynamoDB** console &rarr; **Tables** &rarr; `FindIt-Users`.
2. Find the user's item (by `userId` or email).
3. Edit the item attribute: set `role` to `"admin"`.
4. Save the item.
5. Refresh the FindIt portal &rarr; navigate to `/admin` &rarr; the Admin Dashboard will open with full dispute management and analytics access.

### 4. Photo Uploads (S3 Pre-Signed URLs)
1. Sign in as a user and navigate to `/report`.
2. Select **"I Found an Item"**, fill in the fields, and drop an image.
3. Inspect network traffic:
   - A `POST /uploads/presign` request fetches a signed S3 upload URL.
   - The browser uploads the image directly to S3 via `PUT`.
   - The item is saved to DynamoDB `FindIt-Items` via `POST /items`.

---

## Troubleshooting & Common Pitfalls

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| **`NetworkError when attempting to fetch resource`** | CORS is not enabled or misconfigured on API Gateway. | Ensure API Gateway CORS has `Access-Control-Allow-Origin: *` and allowed headers include `authorization, content-type`. |
| **`Access to XMLHttpRequest blocked by CORS policy on S3`** | Missing CORS policy on the S3 bucket. | Check Step 3 and add the CORS JSON configuration allowing `PUT` from `http://localhost:5173`. |
| **`SignatureDoesNotMatch on S3 upload`** | Mismatched region or signature version. | Ensure `Config(signature_version='s3v4')` is active in `lambda_function.py` and bucket region is `ap-southeast-2`. |
| **`401 Unauthorized on /claims or /items`** | Expired or missing Cognito ID token. | Re-authenticate on the login page; the frontend automatically refreshes JWTs via `aws-amplify`. |
| **`AccessDeniedException on DynamoDB`** | Lambda execution role lacks table permissions. | Check Step 4 and ensure `FindIt-Backend-Policy` covers `FindIt-Items`, `FindIt-Claims`, `FindIt-Users`, and `FindIt-ActivityLog`. |
| **`404 No route matches POST /claims`** | API Gateway path extraction mismatch. | Verify API Gateway route is set to `$default` pointing to `FindIt-Backend`. |

