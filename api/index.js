// Vercel runs this file as the server. Every /api request, the QR page and
// uploaded photos come here; the web app itself is served from app/dist.
module.exports = require('../server/src/app').app;
