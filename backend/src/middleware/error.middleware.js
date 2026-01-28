export function errorHandler(err, _req, res, _next) {
  const status = err.statusCode || 500;

  res.status(status).json({
    message: err.message || "Internal Server Error",
  });
}
