// Sharing the app with any phone.
//
// When `npm run share` is running, the laptop has a public https link
// (a free Cloudflare tunnel). The link is saved in server/.public-url and
// shown here as a QR code. Scanning it opens Campus Fix in Safari or Chrome,
// and "Add to Home Screen" installs it like an app, on iPhone, Android or
// any other phone. Nothing here needs an account or costs money.

const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');
const QRCode = require('qrcode');
const { PORT } = require('./config');

const PUBLIC_URL_FILE = path.join(__dirname, '..', '.public-url');
const ICON = path.join(__dirname, '..', '..', 'app', 'assets', 'images', 'icon.png');

function lanUrl() {
  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses || []) {
      if (address.family === 'IPv4' && !address.internal) return `http://${address.address}:${PORT}`;
    }
  }
  return `http://localhost:${PORT}`;
}

// The best link to give other people, and whether it works outside this network.
function shareUrl(req) {
  if (process.env.PUBLIC_URL) return { url: process.env.PUBLIC_URL.replace(/\/+$/, ''), isPublic: true };
  try {
    const saved = fs.readFileSync(PUBLIC_URL_FILE, 'utf8').trim();
    if (/^https:\/\//.test(saved)) return { url: saved, isPublic: true };
  } catch {
    // no tunnel running
  }
  const host = req.get('host') || '';
  if (/trycloudflare\.com$|onrender\.com$|vercel\.app$/.test(host.split(':')[0])) return { url: `https://${host}`, isPublic: true };
  return { url: lanUrl(), isPublic: false };
}

const router = express.Router();

router.get('/share-info', (req, res) => {
  const { url, isPublic } = shareUrl(req);
  res.json({ url, isPublic, getPage: `${url}/get` });
});

// A QR code for any short text, as an SVG picture.
router.get('/qr.svg', async (req, res) => {
  const text = typeof req.query.text === 'string' ? req.query.text.slice(0, 300) : '';
  if (!text) return res.status(400).json({ error: 'Add ?text= to make a QR code.' });
  const svg = await QRCode.toString(text, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0A0A0B', light: '#FFFFFF' } });
  res.type('image/svg+xml').set('Cache-Control', 'no-store').send(svg);
});

router.get('/get/icon.png', (req, res) => res.sendFile(ICON));

const escape = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

// A page to show on a screen or print: scan to get Campus Fix.
router.get('/get', async (req, res) => {
  const { url, isPublic } = shareUrl(req);
  const qr = await QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0A0A0B', light: '#FFFFFF' } });
  res.type('html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Get Campus Fix</title><link rel="icon" href="/get/icon.png">
<style>
:root{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;background:radial-gradient(1200px 600px at 10% -10%,#262b36,#08090c 55%,#000);color:#f4f5f7;font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;display:flex;align-items:center;justify-content:center;padding:24px}
main{width:100%;max-width:880px;display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:40px;align-items:center}
@media (max-width:760px){main{grid-template-columns:1fr;gap:28px}}
.brand{display:flex;align-items:center;gap:14px}
.brand img{width:56px;height:56px;border-radius:14px}
h1{font-size:44px;line-height:1.05;margin:24px 0 12px;letter-spacing:-.01em}
p{color:#b9bcc4;margin:0 0 18px;max-width:46ch}
.qr{background:#fff;border-radius:28px;padding:22px;box-shadow:0 30px 80px rgba(0,0,0,.6)}
.qr svg{display:block;width:100%;height:auto}
.url{margin-top:14px;text-align:center;font-size:14px;color:#b9bcc4;word-break:break-all}
ol{margin:0;padding:0;list-style:none;display:grid;gap:12px}
li{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:14px 16px}
li b{display:block;color:#fff}
.open{display:inline-block;margin-top:22px;background:linear-gradient(#fff,#cfd2d8);color:#0a0a0b;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:999px}
.warn{background:rgba(255,196,0,.12);border:1px solid rgba(255,196,0,.4);color:#ffd88a;border-radius:14px;padding:12px 14px;margin-bottom:18px}
</style></head><body><main>
<section>
<div class="brand"><img src="/get/icon.png" alt=""><strong style="font-size:22px">Campus Fix</strong></div>
<h1>Scan to get the app</h1>
<p>Report broken things around MCAST, upvote what affects you, find your way on the campus map, and get emergency help. Works on iPhone, Android and any phone with a browser.</p>
${isPublic ? '' : '<div class="warn">This link only works on the same Wi-Fi as the laptop. Run <b>npm run share</b> on the laptop to get a link that works anywhere.</div>'}
<ol>
<li><b>iPhone</b>Point the Camera at the code, open the link in Safari, tap Share, then Add to Home Screen.</li>
<li><b>Android</b>Scan with the Camera or Google Lens, open in Chrome, tap the menu, then Install app.</li>
<li><b>Any other phone</b>Open the link below in its browser.</li>
</ol>
<a class="open" href="${escape(url)}">Open Campus Fix</a>
</section>
<section><div class="qr" role="img" aria-label="QR code for ${escape(url)}">${qr}</div><div class="url">${escape(url)}</div></section>
</main></body></html>`);
});

module.exports = { shareRouter: router, shareUrl, PUBLIC_URL_FILE };
