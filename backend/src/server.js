try {
  import express from 'express';
  import cors from 'cors';
  import bodyParser from 'body-parser';
  import { errorHandler, asyncHandler } from './middleware/errorHandler.js';
  import { generateUploadUrl } from './controllers/uploadController.js';

  import {
    searchImagesHandler,
    getImageStatus
  } from './controllers/searchController.js';

  const app = express();
  const PORT = process.env.PORT || 5000;
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

  app.use(
    cors({
      origin: FRONTEND_URL,
      credentials: true,
    })
  );

  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/generate-upload-url', asyncHandler(generateUploadUrl));

  app.get('/api/search', asyncHandler(searchImagesHandler));

  app.get('/api/status/:imageId', asyncHandler(getImageStatus));

  app.use((req, res) => {
    res.status(404).json({
      error: 'Not found',
      status: 404,
    });
  });

  app.use(errorHandler);

  module.exports = app;

} catch (error) {
  // This is the error-catching mechanism we added to see the crash details
  console.error("FUNCTION INITIALIZATION CRASHED:", error);
  // Export a simple function that immediately crashes and logs the error
  module.exports = (req, res) => {
    console.error("REQUEST RECEIVED AFTER INIT CRASH. Sending 500.", error);
    res.setHeader('Content-Type', 'text/plain');
    res.status(500).send(`Serverless Function Initialization Failed.\n\nError: ${error.stack || error}`);
  };
}