try {
  const express = require('express');
  const cors = require('cors');
  const bodyParser = require('body-parser');

  // Since you are using ES modules, these imports must be dynamic or handled carefully.
  // We assume here that your build process handles the final module resolution, 
  // but changing them to require() is safer if not using an import wrapper.
  // Assuming the original ES import syntax worked on your build machine:
  const { errorHandler, asyncHandler } = require('./middleware/errorHandler.js');
  const { generateUploadUrl } = require('./controllers/uploadController.js');
  const { searchImagesHandler, getImageStatus } = require('./controllers/searchController.js');

  const app = express();
  const PORT = process.env.PORT || 5000;
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

  // Middleware and setup
  app.use(cors({ origin: FRONTEND_URL, credentials: true }));
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  // Routes
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  app.post('/api/generate-upload-url', asyncHandler(generateUploadUrl));
  app.get('/api/search', asyncHandler(searchImagesHandler));
  app.get('/api/status/:imageId', asyncHandler(getImageStatus));

  // Error Handling (Order matters!)
  app.use((req, res) => {
    // This catches unhandled Express routes
    res.status(404).json({
      error: 'Not found',
      status: 404,
    });
  });
  app.use(errorHandler);

  // CRITICAL: Export the Express App for Vercel
  module.exports = app;

} catch (error) {
  // CRITICAL: Fallback function to display the exact initialization crash error.
  console.error("FUNCTION INITIALIZATION CRASHED:", error);

  // This wrapper ensures Vercel's execution environment sees a valid handler, 
  // which immediately returns the error message instead of the generic Vercel 500 page.
  module.exports = (req, res) => {
    console.error("REQUEST RECEIVED AFTER INIT CRASH. Sending 500.", error);
    res.setHeader('Content-Type', 'text/plain');
    res.status(500).send(`Serverless Function Initialization Failed.\n\nError: ${error.stack || error}`);
  };
}