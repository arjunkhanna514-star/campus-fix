# Handoff

From: QA / DevOps. To: Arjun, or the next session on the laptop.

1. In `campus-issue-reporter/`: `npm run setup`, then `npm run smoke` (expect "71 passed, 0 failed").
2. Start two emulators. `npm run server` in one terminal, `npm run app` in another, `Shift+A` for each emulator.
3. Work through `docs/TEST_MATRIX.md` on both emulators. Anything that fails goes to Claude with the exact error.
4. Rehearse `docs/DEMO_SCRIPT.md` once against a timer.

Runbook: `README.md` ("If something goes wrong"). Architecture: `docs/ARCHITECTURE.md`. Decisions: `.10x/adrs/`.
