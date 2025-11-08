# AWS Setup Instructions for Chitralai Image Search Application

This guide provides step-by-step instructions to configure AWS services (S3, DynamoDB, Lambda, IAM) for the Chitralai application.

## Prerequisites

- AWS account with appropriate permissions
- AWS CLI configured (optional but recommended)
- Node.js 18.x or later
- Chitralai code deployed to your local machine

## Step 1: Create S3 Bucket

### 1.1 Create the bucket

1. Go to AWS Console → S3 → **Create bucket**
2. **Bucket name:** `my-image-search-bucket-{your-username}`
   - Must be globally unique
   - Use lowercase letters, numbers, hyphens
   - Example: `my-image-search-bucket-john-2024`
3. **Region:** us-east-1 (match Lambda region)
4. **Block Public Access settings:** Keep all default (block all public access)
5. **Versioning:** Disabled
6. Click **Create bucket**

### 1.2 Configure CORS

The bucket needs CORS configuration to allow direct file uploads from the frontend:

1. Go to your bucket → **Permissions** → **CORS configuration**
2. Paste the following JSON:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedOrigins": ["http://localhost:3000", "https://your-production-domain.com"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

3. Click **Save**

### 1.3 Create uploads folder (optional)

1. In the bucket, click **Create folder**
2. Name it `uploads`
3. Click **Create folder**

**Save for later:**
- Bucket name: `______________________________`

---

## Step 2: Create DynamoDB Table

### 2.1 Create the table

1. Go to AWS Console → DynamoDB → **Create table**
2. **Table name:** `images-metadata`
3. **Partition key:** `imageId` (String)
4. **Sort key:** None
5. **Billing mode:** Pay-per-request (suitable for demo/development)
6. Click **Create table**

### 2.2 Wait for table activation

- The table will be "Creating" for 1-2 minutes
- Wait until status changes to "Active"

**Saved attributes (auto-created when items are added):**
- imageId (Partition Key)
- s3Key (String)
- s3Url (String)
- tags (List of Strings)
- uploadTimestamp (String)

---

## Step 3: Create IAM Role for Lambda

### 3.1 Create the role

1. Go to AWS Console → IAM → Roles → **Create role**
2. **Trusted entity type:** Select "AWS service"
3. **Use case:** Select "Lambda"
4. Click **Next**
5. **Role name:** `lambda-image-analysis-role`
6. Click **Create role**

### 3.2 Add inline policy

1. Open the newly created role: `lambda-image-analysis-role`
2. Click **Add inline policy** (or **Create inline policy**)
3. Choose **JSON** tab
4. Paste the policy from `iam-policy.json` (see next section)
5. Replace placeholders:
   - `YOUR_BUCKET_NAME` → Your S3 bucket name
   - `YOUR_AWS_ACCOUNT_ID` → Your AWS Account ID (find in top-right corner)
   - `us-east-1` → Your AWS region
6. Click **Review policy**
7. **Policy name:** `lambda-image-analysis-policy`
8. Click **Create policy**

---

## Step 4: Create IAM User for Backend Application

### 4.1 Create the user

1. Go to AWS Console → IAM → Users → **Create user**
2. **User name:** `image-search-backend`
3. Do NOT grant AWS Management Console access
4. Click **Next**
5. Click **Next** (skip group assignment)
6. Click **Create user**

### 4.2 Create access key

1. Open user: `image-search-backend`
2. Go to **Security credentials** tab
3. Scroll to **Access keys**
4. Click **Create access key**
5. Choose **Command Line Interface (CLI)**
6. Check the acknowledgement box
7. Click **Create access key**
8. **Save these credentials securely:**
   - Access Key ID: `______________________________`
   - Secret Access Key: `______________________________`

### 4.3 Add policy to user

1. Go to **Permissions** tab
2. Click **Add permissions** → **Create inline policy**
3. Choose **JSON** tab
4. Use the following policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:HeadBucket"
      ],
      "Resource": [
        "arn:aws:s3:::YOUR_BUCKET_NAME",
        "arn:aws:s3:::YOUR_BUCKET_NAME/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:GetItem"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:YOUR_AWS_ACCOUNT_ID:table/images-metadata"
    }
  ]
}
```

5. Replace:
   - `YOUR_BUCKET_NAME` → Your S3 bucket name
   - `YOUR_AWS_ACCOUNT_ID` → Your AWS Account ID
   - `us-east-1` → Your AWS region
6. Click **Review policy**
7. **Policy name:** `backend-s3-dynamo-policy`
8. Click **Create policy**

---

## Step 5: Deploy Lambda Function

### 5.1 Create Lambda function

1. Go to AWS Console → Lambda → **Create function**
2. **Function name:** `image-analysis-lambda`
3. **Runtime:** Node.js 18.x
4. **Architecture:** x86_64 (default)
5. **Execution role:** Select "Use an existing role"
6. **Existing role:** Choose `lambda-image-analysis-role`
7. Click **Create function**

### 5.2 Upload function code

1. In the Lambda console, scroll to **Code** section
2. Delete all existing code
3. Copy the entire contents of `/lambda/index.js`
4. Paste into the Lambda editor
5. Click **Deploy**

### 5.3 Configure function

1. Click the **Configuration** tab
2. Go to **General configuration** → **Edit**
3. Set:
   - **Memory:** 512 MB
   - **Timeout:** 60 seconds
   - Click **Save**

### 5.4 Set environment variables

1. Go to **Configuration** tab → **Environment variables**
2. Click **Edit**
3. Add three environment variables:

| Key | Value |
|-----|-------|
| AWS_REGION | us-east-1 |
| DYNAMODB_TABLE_NAME | images-metadata |
| REKOGNITION_MIN_CONFIDENCE | 80 |

4. Click **Save**

### 5.5 Add S3 permission

1. Go to **Configuration** → **Permissions**
2. Scroll to **Resource-based policy statements**
3. Click **Add permissions**
4. Choose **AWS service** and fill:
   - **Service:** S3
   - **Statement ID:** `AllowS3Invoke`
   - **Action:** s3:GetObject
   - **Principal:** s3.amazonaws.com
   - **ARN:** `arn:aws:s3:::YOUR_BUCKET_NAME/*`
5. Click **Save**

---

## Step 6: Configure S3 Event Notification

### 6.1 Set up Lambda trigger

1. Go to your S3 bucket → **Properties**
2. Scroll to **Event notifications**
3. Click **Create event notification**
4. Fill in:
   - **Event notification name:** `image-uploaded-trigger`
   - **Event types:** Check "All object create events"
   - **Destination:** Lambda function
   - **Lambda function:** Select `image-analysis-lambda`
5. Click **Save**

### 6.2 Test the trigger

1. Upload a test image to your S3 bucket
2. Go to Lambda → `image-analysis-lambda` → **Monitor** tab
3. Check recent invocations
4. Click on an invocation to view logs
5. Verify in DynamoDB that an item was created with tags

---

## Step 7: Configure Backend Application

### 7.1 Update backend .env file

Edit `/backend/.env` with your AWS credentials:

```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=YOUR_SECRET_KEY
S3_BUCKET_NAME=your-bucket-name
DYNAMODB_TABLE_NAME=images-metadata
FRONTEND_URL=http://localhost:3000
```

### 7.2 Install and run backend

```bash
cd backend
npm install
npm run dev
```

Should output:
```
✓ Server running on http://localhost:5000
✓ CORS enabled for: http://localhost:3000
✓ AWS Region: us-east-1
✓ DynamoDB Table: images-metadata
✓ S3 Bucket: my-image-search-bucket
```

---

## Step 8: Configure Frontend Application

### 8.1 Update frontend .env file

Edit `/frontend/.env.local`:

```
VITE_API_BASE_URL=http://localhost:5000
```

### 8.2 Install and run frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend will open at `http://localhost:3000`

---

## Step 9: Complete End-to-End Test

### 9.1 Test image upload

1. Go to frontend: `http://localhost:3000`
2. Upload a test image
3. Wait for "Upload successful! Image is being analyzed..." message
4. Check S3 bucket → should see image in `/uploads/` folder
5. Check Lambda CloudWatch logs for execution

### 9.2 Verify Lambda execution

1. Go to Lambda → `image-analysis-lambda` → **Monitor** tab
2. Look for recent invocations
3. Click on a recent invocation to see logs
4. Should see logs like:
   ```
   Processing image: s3://bucket-name/uploads/...
   Calling Rekognition DetectLabels...
   Detected X labels...
   Storing metadata...
   ```

### 9.3 Verify DynamoDB entry

1. Go to DynamoDB → Tables → `images-metadata` → **Explore table items**
2. Should see entries with:
   - `imageId`: UUID
   - `s3Key`: S3 object path
   - `s3Url`: Public S3 URL
   - `tags`: Array of detected labels (lowercase)
   - `uploadTimestamp`: ISO datetime

### 9.4 Test search functionality

1. In frontend, type search keywords in the search bar
2. Example: "beach sunset" (must match tags from a detected image)
3. Click search or press Enter
4. If matching images exist, they should appear in the grid
5. Try clicking tags to search for them

---

## Troubleshooting

### Problem: S3 upload fails with 403 error

**Solution:** Check CORS configuration in S3 bucket permissions

### Problem: Lambda not being invoked

**Solution:**
1. Check S3 event notification is configured correctly
2. Verify Lambda has S3 permissions
3. Check Lambda CloudWatch logs for errors
4. Test by uploading an image directly to S3

### Problem: No tags detected

**Solution:**
1. Verify Lambda has Rekognition permissions
2. Check that image quality is acceptable for Rekognition
3. Verify REKOGNITION_MIN_CONFIDENCE environment variable (default: 80)
4. Check Lambda logs for Rekognition API errors

### Problem: Search returns no results

**Solution:**
1. Verify DynamoDB has items (check in DynamoDB console)
2. Check that keywords exactly match detected tags (lowercase)
3. Try searching for broader terms
4. Verify backend has DynamoDB read permissions

### Problem: Frontend cannot connect to backend

**Solution:**
1. Verify backend is running on port 5000
2. Check FRONTEND_URL in backend .env matches frontend URL
3. Check browser console for CORS errors
4. Verify VITE_API_BASE_URL in frontend .env.local

---

## Production Deployment Notes

For production deployment:

1. **Frontend:**
   - Update `VITE_API_BASE_URL` to production backend URL
   - Update S3 CORS to allow production domain
   - Build: `npm run build`
   - Deploy to Vercel, Netlify, or S3+CloudFront

2. **Backend:**
   - Update FRONTEND_URL to production frontend domain
   - Use environment-specific .env file
   - Deploy to EC2, Heroku, or AWS Elastic Beanstalk
   - Set environment variables in deployment platform

3. **DynamoDB:**
   - Change billing from pay-per-request to provisioned (if needed)
   - Enable point-in-time recovery
   - Set up backup strategy

4. **Lambda:**
   - Monitor CloudWatch logs regularly
   - Set up alarms for errors
   - Consider reserved concurrency

5. **S3:**
   - Enable bucket versioning
   - Set up lifecycle policies to delete old uploads
   - Enable server-side encryption
   - Consider S3 Transfer Acceleration for faster uploads

---

## AWS Resource Cleanup

To avoid AWS charges, delete resources when no longer needed:

1. **Delete Lambda function:** Lambda → Functions → Delete
2. **Delete S3 bucket:** Empty bucket first, then S3 → Delete
3. **Delete DynamoDB table:** DynamoDB → Tables → Delete
4. **Delete IAM resources:**
   - Delete user: `image-search-backend`
   - Delete role: `lambda-image-analysis-role`
5. **Check CloudWatch Logs:** Delete log groups if desired

---

## Support

For AWS-specific issues, consult:
- AWS Documentation: https://docs.aws.amazon.com/
- AWS Support Center: https://console.aws.amazon.com/support/
- For application issues, check the main README in the repository root
