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

## Useful commands

| Command | What it does |
|---|---|
| `npm run seed` | Resets the database to the demo data. Safe to run while the server is running |
| `npm run smoke` | Runs 71 automatic checks against the API on a separate test database |
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
