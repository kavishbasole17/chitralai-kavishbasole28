import { ddbDocClient } from "../services/dynamoService.js";
import { GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

/**
 * --- THIS IS THE FINAL FIX ---
 * This new helper function is bulletproof. It can handle
 * Sets, Arrays, empty objects, undefined, or null.
 */
function safeConvertSetToArray(item) {
  if (!item) return item; // Guard clause

  const keywords = item.keywords;

  if (keywords instanceof Set) {
    // Case 1: It's a Set (e.g., Set{"a", "b"})
    item.keywords = Array.from(keywords);
  } else if (!Array.isArray(keywords)) {
    // Case 2: It's NOT an array.
    // This means it's {}, undefined, null, etc.
    // In all these cases, it should be an empty array.
    item.keywords = [];
  }
  // Case 3: It's already an Array (do nothing)
  
  return item;
}

/**
 * GET /api/search
 * Searches for images by keyword.
 */
export async function searchImagesHandler(req, res) {
  const { q } = req.query;
  console.log(`[Search] Received search request for: ${q}`);

  if (!q) {
    return res.status(400).json({ error: "Search query 'q' is required" });
  }
  
  const keywords = Array.isArray(q) ? q : [q];
  const filterExpressions = keywords.map((_, index) => `contains(#keywords, :q${index})`);
  const expressionAttributeValues = {
    ":completed": "COMPLETED",
  };
  keywords.forEach((keyword, index) => {
    expressionAttributeValues[`:q${index}`] = keyword.toLowerCase();
  });

  const scanParams = {
    TableName: process.env.DYNAMODB_TABLE_NAME,
    FilterExpression: `(#status = :completed) AND (${filterExpressions.join(' AND ')})`,
    ExpressionAttributeNames: {
      "#status": "status",
      "#keywords": "keywords",
    },
    ExpressionAttributeValues: expressionAttributeValues,
  };

  try {
    const { Items } = await ddbDocClient.send(new ScanCommand(scanParams));
    console.log(`[Search] Found ${Items.length} items for query: ${q}`);
    
    // --- THIS IS THE CRITICAL LINE ---
    // The new helper function will safely map all 8 items
    const safeItems = Items.map(safeConvertSetToArray);
    
    res.json({ images: safeItems });

  } catch (error) {
    console.error("🔥 Error in searchImagesHandler:", error);
    res.status(500).json({ error: "Failed to search images" });
  }
}


/**
 * GET /api/status/:imageId
 * Checks the status of an image in DynamoDB.
 */
export async function getImageStatus(req, res) {
  const { imageId } = req.params;
  console.log(`[Status] Checking status for imageId: ${imageId}`);

  const dbParams = {
    TableName: process.env.DYNAMODB_TABLE_NAME,
    Key: {
      imageID: imageId, 
    },
  };

  try {
    const { Item } = await ddbDocClient.send(new GetCommand(dbParams));

    if (!Item) {
      console.warn(`[Status] Image not found in DB: ${imageId}`);
      return res.status(404).json({ error: "Image record not found" });
    }

    console.log(`[Status] Found item status: ${Item.status}`);
    
    // --- THIS IS THE CRITICAL LINE ---
    // The new helper function will safely convert the Set
    const safeItem = safeConvertSetToArray(Item);
    
    res.json(safeItem);

  } catch (error) {
    console.error("🔥 Error in getImageStatus:", error);
    res.status(500).json({ error: "Failed to get image status" });
  }
}