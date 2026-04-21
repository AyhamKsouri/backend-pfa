const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;

  console.error('[errorHandler] Unhandled request error:', {
    method: req.method,
    originalUrl: req.originalUrl,
    params: req.params,
    query: req.query,
    body: req.body,
    requestContext: err.requestContext || null,
    message: err.message,
    statusCode,
    stage: err.stage || 'unknown',
    code: err.code,
    details: err.responseData || err.details || err.meta || null,
    stack: err.stack,
  });

  res.status(statusCode).json({
    message: err.message || 'Internal server error',
    stage: err.stage || undefined,
    code: err.code || undefined,
  });
};

module.exports = {
  errorHandler,
};
