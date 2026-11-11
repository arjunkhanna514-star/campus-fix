# Run and deliver - Campus Fix

Date: 2026-11-11

- No hosting. Everything runs on the laptop: `npm run setup`, `npm run server`, `npm run app`.
- No CI. The gate before a demo is `npm run smoke` and `npm run typecheck`.
- Rollback: git tags; data rollback is `npm run seed`.
- Emulator networking: `10.0.2.2:4000`, with `adb reverse tcp:4000 tcp:4000` as the fallback.
