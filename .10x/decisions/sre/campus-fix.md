# Keeping the demo up - Campus Fix

Date: 2026-11-11

- **Health:** `GET /health`; the app shows a connection line and a retry on the login and profile screens.
- **Logging:** one line per request in the server terminal.
- **Runbook:** server not found > check terminal 1 > Try again > `adb reverse`. Wrong data > `npm run seed`. Slow laptop > 2 GB RAM per emulator.
- **Target for the demo:** both emulators responsive, feed refresh within 10 s.
