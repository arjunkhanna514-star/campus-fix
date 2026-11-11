// The Campus Fix server as one Express app: the API, the QR page and the web app.
// index.js runs it on a port (laptop, Render); api/index.js runs it on Vercel.

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { driver, DB_PATH } = require('./db');
const { UPLOAD_DIR } = require('./config');
const { seedIfEmpty } = require('./seed');
const { notFound, errorHandler } = require('./middleware/errors');
const { shareRouter } = require('./share');

const app = express();

app.use(cors());
app.use(express.json({ limit: '100kb' }));

// One line per request in the terminal: handy for watching the demo live.
app.use((req, res, next) => {
  const started = Date.now();
  res.on('finish', () => {
    if (req.path !== '/health') {
      console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - started} ms)`);
    }
  });
  next();
});

// All the API routes. They answer at /api/... (used by the web version of the
// app, which is served from this same server) and also at the root, which is
// what the phone app has always used.
const api = express.Router();
api.get('/health', (req, res) => res.json({ ok: true, name: 'campus-fix-api' }));
// Uploaded photos are served as plain files.
api.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '1d' }));
api.use('/auth', require('./routes/auth'));
// Order matters: /admin is checked first so its admin-only guard never touches student routes.
api.use('/admin', require('./routes/admin'));
api.use(shareRouter);
api.use(require('./routes/users'));
api.use(require('./routes/issues'));

app.use('/api', api);
app.use(shareRouter); // /get: the "scan to get the app" page

// The web version of the app (built into app/dist). Opening the server's address
// in Safari or Chrome loads Campus Fix, and "Add to Home Screen" installs it.
const WEB_DIR = path.join(__dirname, '..', '..', 'app', 'dist');
const hasWebApp = fs.existsSync(path.join(WEB_DIR, 'index.html'));
if (hasWebApp) {
  app.use(express.static(WEB_DIR, { index: false, maxAge: '1h' }));
  // A browser opening a page (not the API asking for data) gets the app.
  app.use((req, res, next) => {
    if (req.method === 'GET' && (req.headers.accept || '').includes('text/html') && !req.path.startsWith('/uploads')) {
      return res.sendFile(path.join(WEB_DIR, 'index.html'));
    }
    next();
  });
}

app.use(api);

app.use(notFound);
app.use(errorHandler);

// First run on a fresh machine: fill the database with demo data.
if (seedIfEmpty()) console.log('Empty database found: demo data added.');

module.exports = { app, hasWebApp, driver, DB_PATH };
