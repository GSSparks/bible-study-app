export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = err.status || 500;
  // A 404 for a genuinely-missing key/entry is routine, expected
  // behavior, not a server problem — logging it with a full stack trace
  // (as every error was getting before) reads as alarming for something
  // that isn't actually wrong. Real server errors (5xx) still get the
  // full trace; 4xx client-driven errors get one short line.
  if (status >= 500) {
    console.error(err);
  } else {
    console.warn(`${req.method} ${req.originalUrl} -> ${status}: ${err.message}`);
  }
  res.status(status).json({
    error: err.message || 'Internal server error',
  });
}