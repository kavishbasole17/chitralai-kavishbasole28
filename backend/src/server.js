import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

// The build system expects these to be ES Modules based on the error logs.
// Assuming these are all local files with .js extension and no internal CJS exports:
import { errorHandler, asyncHandler } from './middleware/errorHandler.js';
import { generateUploadUrl } from './controllers/uploadController.js';
import {
  searchImagesHandler,
  getImageStatus
} from './controllers/searchController.js';

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// ===== Middleware =====

// CORS configuration
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

// Body parser
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// ===== API Routes =====

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Generate presigned upload URL
app.post('/api/generate-upload-url', asyncHandler(generateUploadUrl));

// Search images by keywords
app.get('/api/search', asyncHandler(searchImagesHandler));

// Get image status
app.get('/api/status/:imageId', asyncHandler(getImageStatus));

// ===== Error Handling =====

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    status: 404,
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// CRITICAL: Export the Express App for Vercel using ES Module syntax
export default app;