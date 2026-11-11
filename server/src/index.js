// Campus Fix API server.
// Start with:  npm run dev   (restarts on changes)   or   npm start

const os = require('os');
const path = require('path');
const { app, hasWebApp, driver, DB_PATH } = require('./app');
const { PORT } = require('./config');

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
  if (hasWebApp) console.log(`  Web app and QR page: http://localhost:${PORT}/get   (run "npm run share" for a link that works on any phone)`);
});
