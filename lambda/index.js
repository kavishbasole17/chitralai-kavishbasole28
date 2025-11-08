const AWS = require('aws-sdk');

const rekognition = new AWS.Rekognition({
  region: process.env.AWS_REGION,
});

const dynamoDB = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION,
});

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME;
const MIN_CONFIDENCE = parseInt(process.env.REKOGNITION_MIN_CONFIDENCE || '80', 10);
const MAX_TAGS = 20;

/**
 * Extract image ID from S3 key
 * Key format: uploads/{timestamp}-{randomId}-{filename}
 * Extract: {randomId}
 * @param {string} s3Key - S3 object key
 * @returns {string} Image ID (random part of the key)
 */
function extractImageIdFromKey(s3Key) {
  const parts = s3Key.split('/');
  const filename = parts[parts.length - 1];
  const filenameParts = filename.split('-');

  if (filenameParts.length >= 2) {
    return filenameParts[1]; // Return the randomId part
  }

  return filename.split('.')[0]; // Fallback to filename without extension
}

/**
 * Call Rekognition DetectLabels API
 * @param {string} bucketName - S3 bucket name
 * @param {string} s3Key - S3 object key
 * @returns {Promise<Array>} Array of labels with confidence scores
 */
async function detectLabels(bucketName, s3Key) {
  const params = {
    Image: {
      S3Object: {
        Bucket: bucketName,
        Name: s3Key,
      },
    },
    MaxLabels: 100,
    MinConfidence: MIN_CONFIDENCE,
  };

  const response = await rekognition.detectLabels(params).promise();
  return response.Labels || [];
}

/**
 * Process labels from Rekognition
 * Filter by confidence, convert to lowercase, remove duplicates
 * @param {Array} labels - Labels from Rekognition
 * @returns {Array} Processed tags (lowercase, unique, max MAX_TAGS)
 */
function processLabels(labels) {
  const tags = labels
    .filter((label) => label.Confidence >= MIN_CONFIDENCE)
    .map((label) => label.Name.toLowerCase())
    .filter((tag, index, self) => self.indexOf(tag) === index) // Remove duplicates
    .slice(0, MAX_TAGS); // Limit to MAX_TAGS

  return tags;
}

/**
 * Store image metadata in DynamoDB
 * @param {string} imageId - Unique image ID
 * @param {string} s3Key - S3 object key
 * @param {string} bucketName - S3 bucket name
 * @param {Array} tags - Array of tags
 * @returns {Promise<Object>} DynamoDB put response
 */
async function storeImageMetadata(imageId, s3Key, bucketName, tags) {
  const s3Url = `https://${bucketName}.s3.amazonaws.com/${s3Key}`;
  const uploadTimestamp = new Date().toISOString();

  const params = {
    TableName: TABLE_NAME,
    Item: {
      imageId,
      s3Key,
      s3Url,
      tags,
      uploadTimestamp,
    },
  };

  return await dynamoDB.put(params).promise();
}

/**
 * Lambda handler
 * Triggered by S3 event when image is uploaded
 */
exports.handler = async (event) => {
  try {
    console.log('Event received:', JSON.stringify(event, null, 2));

    // Extract S3 details from event
    if (!event.Records || event.Records.length === 0) {
      throw new Error('No S3 records in event');
    }

    const record = event.Records[0];
    const bucketName = record.s3.bucket.name;
    const s3Key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    console.log(`Processing image: s3://${bucketName}/${s3Key}`);

    // Step 1: Call Rekognition to detect labels
    console.log('Calling Rekognition DetectLabels...');
    const labels = await detectLabels(bucketName, s3Key);
    console.log(`Detected ${labels.length} labels:`, labels);

    // Step 2: Process labels
    const tags = processLabels(labels);
    console.log(`Processed tags (${tags.length}):`, tags);

    if (tags.length === 0) {
      console.warn('No tags with sufficient confidence detected');
    }

    // Step 3: Generate image ID and store in DynamoDB
    const imageId = extractImageIdFromKey(s3Key);
    console.log(`Storing metadata for image: ${imageId}`);

    await storeImageMetadata(imageId, s3Key, bucketName, tags);
    console.log('Image metadata stored successfully');

    // Step 4: Return success response
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Image analyzed and stored',
        imageId,
        tags,
        s3Key,
      }),
    };
  } catch (error) {
    console.error('Lambda execution error:', error);

    return {
      statusCode: 500,
      error: error.message || 'Internal server error',
    };
  }
};
