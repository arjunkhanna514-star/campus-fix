// Campus Fix API server.
// Start with:  npm run dev   (restarts on changes)   or   npm start

const express = require('express');
const cors = require('cors');
const os = require('os');
const path = require('path');
const { driver, DB_PATH } = require('./db');
const { PORT } = require('./config');
const { seedIfEmpty } = require('./seed');
const { notFound, errorHandler } = require('./middleware/errors');

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

app.get('/health', (req, res) => res.json({ ok: true, name: 'campus-fix-api' }));

// Uploaded photos are served as plain files.
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), { maxAge: '1d' }));

app.use('/auth', require('./routes/auth'));
// Order matters: /admin is checked first so its admin-only guard never touches student routes.
app.use('/admin', require('./routes/admin'));
app.use(require('./routes/users'));
app.use(require('./routes/issues'));

app.use(notFound);
app.use(errorHandler);

// First run on a fresh machine: fill the database with demo data.
if (seedIfEmpty()) console.log('Empty database found: demo data added.');

// 0.0.0.0 makes the server reachable from emulators and phones, not only this laptop.
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Campus Fix API running (database: ${path.basename(DB_PATH)}, driver: ${driver})`);
  console.log(`  This laptop:       http://localhost:${PORT}`);
  console.log(`  Android emulator:  http://10.0.2.2:${PORT}`);
  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses || []) {
      if (address.family === 'IPv4' && !address.internal) {
        console.log(`  Phone on same Wi-Fi: http://${address.address}:${PORT}`);
      }
    }
  }
});
