// After "expo export -p web": turn the web build into an installable app.
// Adds the manifest, icons and service worker, and the tags iPhone and
// Android need for "Add to Home Screen" (own icon, full screen, dark bar).

const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const PWA = path.join(__dirname, '..', 'pwa');
const index = path.join(DIST, 'index.html');
if (!fs.existsSync(index)) {
  console.error('dist/index.html not found. Run "expo export -p web" first.');
  process.exit(1);
}
for (const file of fs.readdirSync(PWA)) fs.copyFileSync(path.join(PWA, file), path.join(DIST, file));

let html = fs.readFileSync(index, 'utf8');
const tags = `
    <style id="campus-fix-shell">
      /* Dark behind everything, so no white ever shows at the edges or when the page bounces. */
      html, body { background-color: #0D0D11; color-scheme: dark; overscroll-behavior: none; }
      /* Installed on an iPhone (Add to Home Screen) with the see-through status bar, height 100%
         stops short of the bottom of the screen and leaves a strip. Fill the whole screen instead. */
      @media all and (display-mode: standalone) { html, body, #root { height: 100vh; min-height: 100vh; } }
    </style>
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <meta name="theme-color" content="#0D0D11" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Campus Fix" />
    <meta name="description" content="Report problems around MCAST, upvote what affects you, find your way and get emergency help." />
    <script>if ('serviceWorker' in navigator && location.protocol === 'https:') addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));</script>
`;
if (!html.includes('campus-fix-shell')) html = html.replace('</head>', `${tags}</head>`);
html = html.replace(/<meta name="viewport" content="([^"]*)"/, (m, content) => (content.includes('viewport-fit') ? m : `<meta name="viewport" content="${content}, viewport-fit=cover"`));
html = html.replace(/<title>[^<]*<\/title>/, '<title>Campus Fix</title>');
fs.writeFileSync(index, html);
console.log('Web build ready to install: manifest, icons, service worker and phone tags added.');
