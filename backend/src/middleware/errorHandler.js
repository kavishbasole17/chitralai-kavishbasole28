/**
 * Global error handling middleware
 * Catches and formats all errors with consistent response structure
 */
export function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // Determine status code
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  // Custom error mappings
  if (err.code === 'ValidationError') {
    statusCode = 400;
  } else if (err.code === 'NotFound') {
    statusCode = 404;
  }

  // Return error response
  res.status(statusCode).json({
    error: message,
    status: statusCode,
  });
}

/**
 * Wrapper for async route handlers to catch errors
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
