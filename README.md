# Campus Fix

A mobile app for reporting problems around campus. Students report a problem, see what others have reported, and upvote the ones that affect them. An administrator moves each report through four steps: Reported, Acknowledged, In Progress, Resolved. Points, levels and badges reward reports that turn out to be useful.

Built for the MCAST "Campus Issue Reporter" task.

## What is in this folder

| Folder | What it is |
|---|---|
| `server/` | The API and database: Node.js, Express and SQLite |
| `app/` | The mobile app: Expo (React Native) and TypeScript |
| `docs/` | Architecture, AI usage log, judge questions, demo script, test matrix |

## What you need

- Node.js 22.13 or newer (the LTS version is fine)
- Android Studio with two emulators (for example a Pixel 8 and a small phone or a tablet)

Everything is free, and nothing needs an account or the internet once it is installed.

## First-time setup

Run these from this folder, once:

```
npm run setup
```

That installs the libraries for the server and for the app. (It is the same as running `npm install` inside `server/` and inside `app/`.)

## Run it

Open two terminals in this folder.

**Terminal 1, the server:**

```
npm run server
```

It prints the addresses it can be reached at. The first time it runs it fills the database with demo data.

**Terminal 2, the app:**

```
npm run app
```

Then, with both emulators already open:

- press `Shift` + `A` and choose the first emulator
- press `Shift` + `A` again and choose the second emulator

The first launch on each emulator installs Expo Go, which needs the internet once.

To open it in a browser on the laptop instead, press `w`.

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@campus.test` | `Admin123!` |
| Student | `alice@campus.test` | `Student123!` |
| Student | `ben@campus.test` | `Student123!` |

Six more students exist with the same password: chloe, luca, maria, karl, nadia and sam. The login screen has buttons that fill in Alice and the admin for you.

## Use it on your own phone, or share it with anyone (free)

**Fastest, works on every phone: the shared link and QR code**
1. Keep the server running (`npm run server`), then in a second window run `npm run share`.
2. It opens a free Cloudflare link (no account) and prints a QR code in the terminal. The QR page is also at `<link>/get`; show it on a big screen.
3. Anyone scans it with the phone camera:
   - **iPhone:** opens in Safari. Tap Share, then Add to Home Screen. Campus Fix gets its own icon and opens full screen.
   - **Android:** opens in Chrome. Tap the menu, then Install app.
   - **Any other phone:** open the link in its browser.
4. In the app, the QR button on Home (or Profile, Share the app) shows the same code.

The link works while the laptop is on and the window stays open. Each run gives a new link. If `app/dist` is missing, build it once with `npm run web:build`.


The app is set up for both Android and iPhone (bundle id `com.campusfix.app`, with the logo as the icon and splash screen). The phone always needs to reach the server, so keep `npm run server` running on the laptop and put the phone on the same Wi-Fi.

**iPhone or Android, free, in a few minutes: Expo Go**
1. Install **Expo Go** from the App Store or Google Play.
2. Run `npm run app` on the laptop and scan the QR code (iPhone: with the Camera app; Android: inside Expo Go).
3. The app finds the server automatically through the laptop's Wi-Fi address. If not, tap Change on the login screen and type the address the server prints, for example `192.168.1.20:4000`.

Some networks (campus and venue Wi-Fi) block devices from talking to each other. At home it works.

**Android as a real installed app, free: an APK**
1. Create a free account at expo.dev, then run `npx eas-cli@latest login` inside `app/`.
2. Run `npx eas-cli@latest build -p android --profile preview`. Expo builds it in the cloud (about 10–20 minutes) and gives a download link.
3. Open the link on the Android phone and install the APK.

The satellite view works everywhere with no setup: Apple's satellite map on iPhone, Google's in Expo Go, and Google's free satellite embed on the web and in the APK.

**iPhone as a real installed app**
Apple only allows this through an Apple Developer account (99 USD a year): `npx eas-cli@latest build -p ios --profile preview`, then install through the link or TestFlight. Without that account, use Expo Go as above.

**Location on the real campus.** Allow location when asked. The map shows which block you are in and follows you during directions. If the blue dot is a few metres off, tap "Fix position" on the map and choose where you are standing.

## Always online, with the laptop off (free hosting on Vercel)

The repo includes `vercel.json`, so Vercel (vercel.com, free Hobby plan, no card) hosts the web app and the server together:
1. Push this folder to GitHub (repo `campus-fix`).
2. On vercel.com, sign in with GitHub, choose **Add New > Project**, import `campus-fix`, name the project `campus-fix-mcast`, leave every setting as it is, and press **Deploy**.
3. In about a minute the app is live at `https://campus-fix-mcast.vercel.app`. Open `/get` for a QR code anyone can scan. On an iPhone: open the link in Safari, tap Share, then Add to Home Screen. The phone app also falls back to this address when the laptop is off.

How it works: the web app in `app/dist` is served as static files, and `api/index.js` runs the same Express server (`server/src/app.js`) as a serverless function. Good to know: Vercel's free functions have no permanent disk, so the database lives in `/tmp` and goes back to the demo data when Vercel starts a fresh copy (after a while with no visitors, or after a redeploy). That suits a demo; for real use, move the data to a hosted database. The web build in `app/dist` is committed, so run `npm run web:build` and push again after changing the app.

## Useful commands

| Command | What it does |
|---|---|
| `npm run seed` | Resets the database to the demo data. Safe to run while the server is running |
| `npm run smoke` | Runs 97 automatic checks against the API on a separate test database |
| `npm run typecheck` | Checks the app's TypeScript |

## How the app finds the server

The app tries these addresses and uses the first one that answers:

1. an address typed in on the login screen (Change, next to the connection line)
2. the laptop running Expo, which is what a real phone on the same Wi-Fi needs
3. `http://10.0.2.2:4000`, which is how an Android emulator reaches the laptop
4. `http://localhost:4000`, for the browser

If an emulator still cannot connect, run this once per emulator and it will work through localhost:

```
adb -s <emulator-id> reverse tcp:4000 tcp:4000
```

`adb devices` lists the emulator ids.

## If something goes wrong

| Problem | Fix |
|---|---|
| "Server not found" on the login screen | Check Terminal 1 is still running, then tap Try again |
| `better-sqlite3` fails to install | Nothing to do. The server uses the SQLite built into Node instead |
| Expo Go says the project is incompatible | Let `npm run app` reinstall Expo Go when it asks |
| The laptop is slow with two emulators | Give each emulator 2 GB of RAM and close other programs |
