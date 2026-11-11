// One place that turns any thrown error into a clean JSON response.

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function notFound(req, res) {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
}

// Express calls this whenever a route throws.
function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  // File upload problems reported by multer.
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Photo is too large. The limit is 5 MB.' });
  }
  if (err && err.name === 'MulterError') {
    return res.status(400).json({ error: 'Photo upload failed. Try a different image.' });
  }
  // Malformed JSON in the request body.
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'The request body is not valid JSON.' });
  }
  // The database refused a write that breaks one of its rules.
  if (err && typeof err.code === 'string' && err.code.startsWith('SQLITE_CONSTRAINT')) {
    return res.status(409).json({ error: 'That change conflicts with existing data.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
}

module.exports = { HttpError, notFound, errorHandler };
