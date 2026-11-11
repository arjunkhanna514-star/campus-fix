// npm run share
//
// Puts Campus Fix on a public https link so ANY phone can use it: iPhone,
// Android or anything with a browser. It uses a free Cloudflare quick tunnel
// (no account, no cost). Then it prints a QR code right here in the terminal.
//
// The link works while this window stays open and the laptop is on. Each run
// gives a new link, so show the QR code again after a restart.

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SERVER_DIR = path.join(ROOT, 'server');
const PUBLIC_URL_FILE = path.join(SERVER_DIR, '.public-url');
const WEB_INDEX = path.join(ROOT, 'app', 'dist', 'index.html');
const PORT = 4000;
const QRCode = require(require.resolve('qrcode', { paths: [SERVER_DIR] }));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function healthy(url) {
  try {
    const res = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(4000) });
    return res.ok && (await res.json()).ok === true;
  } catch {
    return false;
  }
}

function cleanup() {
  try {
    fs.unlinkSync(PUBLIC_URL_FILE);
  } catch {
    // already gone
  }
}

async function main() {
  if (!fs.existsSync(WEB_INDEX)) {
    console.log('The web version of the app is missing (app/dist).');
    console.log('Build it once with:  npm run web:build   then run  npm run share  again.');
    process.exit(1);
  }

  // 1. Make sure the server is running (start it here if not).
  let server = null;
  if (!(await healthy(`http://localhost:${PORT}`))) {
    console.log('Starting the Campus Fix server...');
    server = spawn(process.execPath, [path.join(SERVER_DIR, 'src', 'index.js')], { cwd: SERVER_DIR, stdio: 'inherit' });
    for (let i = 0; i < 60 && !(await healthy(`http://localhost:${PORT}`)); i++) await sleep(1000);
    if (!(await healthy(`http://localhost:${PORT}`))) {
      console.log('The server did not start. Run "npm run server" in another window and try again.');
      process.exit(1);
    }
  } else {
    console.log('Campus Fix server is already running.');
  }

  // 2. Open the tunnel. Uses an installed cloudflared if there is one, otherwise downloads it once with npx.
  console.log('Opening a free public link (Cloudflare quick tunnel)...');
  const args = ['tunnel', '--url', `http://localhost:${PORT}`, '--no-autoupdate', '--protocol', 'http2'];
  const isWin = process.platform === 'win32';
  let tunnel = spawn('cloudflared', args, { shell: isWin });
  let usedNpx = false;
  const startNpx = () => {
    usedNpx = true;
    tunnel = spawn(isWin ? 'npx.cmd' : 'npx', ['-y', 'cloudflared', ...args], { shell: isWin });
    watch(tunnel);
  };

  let url = null;
  const watch = (child) => {
    const onData = (chunk) => {
      const match = String(chunk).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match && !url) url = match[0];
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('error', () => {
      if (!usedNpx) startNpx();
    });
    child.on('exit', (code) => {
      if (!url && !usedNpx && code !== 0) startNpx();
    });
  };
  watch(tunnel);

  for (let i = 0; i < 120 && !url; i++) await sleep(1000);
  if (!url) {
    console.log('\nCould not open the public link. The network may block Cloudflare tunnels.');
    console.log(`Phones on the same Wi-Fi can still use http://<this laptop's IP>:${PORT}/get`);
    process.exit(1);
  }

  // 3. Wait until the link really answers, then save it and show the QR code.
  process.stdout.write(`Link created: ${url}\nWaiting for it to come online`);
  for (let i = 0; i < 45 && !(await healthy(url)); i++) {
    process.stdout.write('.');
    await sleep(1500);
  }
  console.log('');
  fs.writeFileSync(PUBLIC_URL_FILE, url);

  if (process.env.SHARE_QUIET) {
    console.log(`Server link ready: ${url}`);
  } else {
  const qr = await QRCode.toString(url, { type: 'terminal', small: true });
  console.log('\n' + qr);
  console.log('  Campus Fix is online. Scan the code with any phone camera.');
  console.log(`  App:            ${url}`);
  console.log(`  QR page:        ${url}/get   (show this on a big screen)`);
  console.log('  iPhone:  open in Safari > Share > Add to Home Screen');
  console.log('  Android: open in Chrome > menu > Install app');
  console.log('\n  Keep this window open. Press Ctrl+C to stop sharing.\n');
  }

  const stop = () => {
    cleanup();
    tunnel.kill();
    if (server) server.kill();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  tunnel.on('exit', () => {
    console.log('The public link closed.');
    cleanup();
  });
}

main().catch((err) => {
  console.error(err);
  cleanup();
  process.exit(1);
});
