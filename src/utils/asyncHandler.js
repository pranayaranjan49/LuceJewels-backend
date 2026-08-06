// Wraps async controllers so we don't need try/catch everywhere.
// Any thrown/rejected error is forwarded to the global error handler.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
