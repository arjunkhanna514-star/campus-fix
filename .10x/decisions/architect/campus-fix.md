# System design - Campus Fix

Date: 2026-11-11

- **Three parts:** Expo app > REST/JSON > Express > SQLite file + uploads folder. See ADR-001.
- **Boundaries:** the app never touches the database. `app/src/api.ts` is the only network code. `server/src/gamification.js` is the only place points and badges are decided.
- **Rules live in the database:** composite PK on `upvotes` and `user_badges`, CHECK on `issues.status`, foreign keys on.
- **Derived, never stored:** upvote count (COUNT) and points (SUM of the ledger).
- **Live updates:** polling every 10 s while a screen is focused. Chosen over WebSockets for simplicity.
- **Failure modes:** server unreachable (app shows a retry and a manual address field); two admins at once (guarded UPDATE, 409); native SQLite driver missing (falls back to `node:sqlite`).
