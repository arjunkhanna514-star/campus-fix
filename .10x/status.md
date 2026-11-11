# Status - Campus Fix

Updated: 2026-11-11

| Phase | State |
|---|---|
| 0 Brainstorm / spec | Done (plan signed off, spec written) |
| 1 Strategy | Done |
| 2 Design | Done (ADR-001, ADR-002) |
| 3 Planning | Done |
| 4 Implementation | Done |
| 5 Verification | Done in the cloud workspace; **Android emulator run still to do** |
| 6 Delivery | Files delivered to the project folder; laptop setup in progress |

## Open items
1. Run on two Android emulators and fill in `docs/TEST_MATRIX.md`.
2. Arjun to confirm whether competition rules allow a pre-built app.
3. Arjun to fill in "My own checks" in `docs/AI_USAGE.md` and rehearse the demo.

## 2026-11-11 afternoon: Home, weather, departments, languages, tour
- Spec: specs/2026-11-11-home-weather-departments-design.md. ADR-003.
- Built: departments table + migration + filters (API and app), Home first tab, live weather + avatar + effects (Home and map), 10 languages, voice tour, language and tour rows in Profile.
- Verified: smoke 97/97; browser suites 24 + 13 + 14 + 14 + 43; translations check 0 problems; android/ios/web bundles built.
- Still to do by Arjun: rows 1-30 of docs/TEST_MATRIX.md on the emulators; hear the voice on a real device.

## 2026-11-11 17:45 — Final upgrade
- UI rebuilt as "glass spheres in the dark" (original SVG wallpaper, graphite + lavender/blue), clock-synced endless motion (`motion.ts`).
- Satellite: Google free embed on web + Android APK; Apple/Google native maps elsewhere; weather overlay off in satellite.
- Hosting: `render.yaml` (Render free), keep-awake workflow, `app/dist` committed, hosted URL fallback in `api.ts`. Waiting on: empty GitHub repo `campus-fix` (creation blocked from the cloud session).
- Verified: tsc, i18n 0 problems, e2e 157/157, sweep 114 screens 0 problems, smoke 97/97, iOS + Android bundles build.

## 2026-11-11 18:20 — Vercel hosting
- Server split into app.js + index.js; api/index.js for Vercel; vercel.json; render.yaml and keep-awake removed.
- Verified against a Vercel-like local host: share 14/14, deep 22/22, satellite 10/10, sweep 114 screens 0 problems; laptop server: e2e 24, addons 13, map 14, live 14, home 43; smoke 97.
