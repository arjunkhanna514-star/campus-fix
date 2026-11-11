# What was built - Campus Fix

Date: 2026-11-11

- `server/`: config, schema, db (two drivers), seed (9 users, 20 reports), auth, issues, admin, users routes, gamification, smoke test.
- `app/`: 8 screens, 8 component files, api, auth, session, toast, theme, storage, format, types.
- `docs/`: architecture, AI usage, judge Q&A, demo script, test matrix.
- **Deviations from the plan:** React Native Paper dropped for hand-written components; `better-sqlite3` made optional with an automatic fallback; `GET /meta` added so the app reads buildings and point rules from the server.
- **Tech debt:** no rate limit on login; polling instead of push; no automated test on a real Android device.
