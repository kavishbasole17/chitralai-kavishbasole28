import { v4 as uuidv4 } from "uuid";
import { generatePresignedUrl } from "../services/s3Service.js";
import { ddbDocClient } from "../services/dynamoService.js";
import { PutCommand } from "@aws-sdk/lib-dynamodb";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_FILENAME_LENGTH = 255;

function validateFileName(fileName) {
  if (!fileName || typeof fileName !== "string") {
    throw new Error("fileName is required and must be a string");
  }
  if (fileName.length > MAX_FILENAME_LENGTH) {
    throw new Error("File name exceeds maximum length of 255 characters");
  }
  const validNameRegex = /^[a-zA-Z0-9._\-\s]+$/;
  if (!validNameRegex.test(fileName)) {
    throw new Error("File name contains invalid characters.");
  }
}

function validateFileType(fileType) {
  if (!fileType || typeof fileType !== "string") {
    throw new Error("fileType is required and must be a string");
  }
  if (!ALLOWED_MIME_TYPES.includes(fileType)) {
    throw new Error("Invalid file type.");
  }
}

/**
 * Generate a structured S3 key name
 * NEW: We now embed the unique imageID (UUID) in the key
 */
function generateS3Key(imageId, fileName) {
  const sanitizedFileName = fileName.replace(/\s+/g, '_'); 
  // The imageId is now the "folder"
  return `uploads/${imageId}/${sanitizedFileName}`;
}

/**
 * POST /api/generate-upload-url
 * Generates a presigned URL and creates a PENDING DynamoDB record.
 */
export async function generateUploadUrl(req, res, next) {
  console.log("📥 Received request to /api/generate-upload-url");
  console.log("➡️ Body received:", req.body);

  try {
    const { fileName, fileType } = req.body;

    validateFileName(fileName);
    validateFileType(fileType);

    // 1. Generate the unique ID FIRST
    const imageId = uuidv4();
    
    // 2. Generate the S3 key USING the ID
    const s3Key = generateS3Key(imageId, fileName);
    console.log("🪣 Generated S3 Key:", s3Key);

    const { presignedUrl, expiresIn } = await generatePresignedUrl(s3Key, fileType);
    console.log("✅ Presigned URL generated successfully");

    console.log(`⏳ Creating PENDING record in DynamoDB with ID: ${imageId}`);
    const dbParams = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Item: {
        imageID: imageId,    // Use 'imageID' as the Primary Key
        s3Key: s3Key,
        fileName: fileName,
        fileType: fileType,
        status: "PENDING", 
        createdAt: new Date().toISOString(),
      },
    };

    await ddbDocClient.send(new PutCommand(dbParams));
    console.log(`✅ Successfully created PENDING record`);

    res.status(200).json({
      presignedUrl,
      imageId, // This ID is sent to the frontend for polling
      expiresIn,
    });

  } catch (error) {
    console.error("🔥 Error in generateUploadUrl:", error);
    if (error.name === 'ResourceNotFoundException') {
       return res.status(500).json({ error: "DynamoDB table not found" });
    }
    res.status(error.statusCode || 400).json({
      error: error.message || "Failed to generate upload URL",
    });
  }
}