import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME;
const PRESIGNED_URL_EXPIRATION = 900; // 15 minutes

/**
 * Generate a presigned URL for uploading a file to S3
 * @param {string} s3Key - S3 object key
 * @param {string} fileType - MIME type (e.g., "image/jpeg")
 * @returns {Promise<Object>} { presignedUrl, expiresIn }
 */
export async function generatePresignedUrl(s3Key, fileType) {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      ContentType: fileType,
      Expires: PRESIGNED_URL_EXPIRATION,
    };

    const presignedUrl = await s3.getSignedUrlPromise('putObject', params);

    return {
      presignedUrl,
      expiresIn: PRESIGNED_URL_EXPIRATION,
    };
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw error;
  }
}

/**
 * Generate a public HTTPS URL for an object in S3
 * @param {string} s3Key - S3 object key
 * @returns {string} Public HTTPS URL
 */
export function getPublicImageUrl(s3Key) {
  return `https://${BUCKET_NAME}.s3.amazonaws.com/${s3Key}`;
}

/**
 * Check if object exists in S3
 * @param {string} s3Key - S3 object key
 * @returns {Promise<boolean>} True if object exists
 */
export async function objectExists(s3Key) {
  try {
    await s3.headObject({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    }).promise();
    return true;
  } catch (error) {
    if (error.code === 'NotFound') {
      return false;
    }
    throw error;
  }
}
