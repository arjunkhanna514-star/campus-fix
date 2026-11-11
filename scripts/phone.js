// npm run phone
//
// Runs the REAL phone app (not the web version) on an iPhone or Android phone
// through Expo Go, from anywhere:
//   1. starts the server and its free public https link (see share.js),
//   2. starts the app with that link built in,
//   3. opens Expo's own tunnel, so the phone never has to reach the laptop
//      directly (venue Wi-Fi and hotspots cannot block it).
// Scan the QR code it prints with the iPhone Camera (or Expo Go on Android).

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PUBLIC_URL_FILE = path.join(ROOT, 'server', '.public-url');
const isWin = process.platform === 'win32';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  try { fs.unlinkSync(PUBLIC_URL_FILE); } catch { /* none */ }

  console.log('Step 1 of 2: starting the server and its public link...');
  const share = spawn(process.execPath, [path.join(__dirname, 'share.js')], { cwd: ROOT, env: { ...process.env, SHARE_QUIET: '1' }, stdio: 'inherit' });

  let url = null;
  for (let i = 0; i < 180 && !url; i++) {
    try { url = fs.readFileSync(PUBLIC_URL_FILE, 'utf8').trim(); } catch { /* not yet */ }
    if (share.exitCode !== null) break;
    await sleep(1000);
  }
  if (!url) {
    console.log('\nNo public server link. The app will still open, but the phone must be on the same Wi-Fi as this laptop to reach the server.');
  }

  console.log('\nStep 2 of 2: starting the phone app through Expo\'s tunnel (the first time takes a minute)...');
  const env = { ...process.env };
  if (url) env.EXPO_PUBLIC_API_URL = `${url}/api`;
  const expo = spawn(isWin ? 'npx.cmd' : 'npx', ['expo', 'start', '--tunnel', '--clear'], { cwd: path.join(ROOT, 'app'), env, stdio: 'inherit', shell: isWin });

  const stop = () => {
    expo.kill();
    share.kill();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  expo.on('exit', () => {
    share.kill();
    process.exit(0);
  });
}

main();
