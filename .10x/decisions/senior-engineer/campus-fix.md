# Implementation approach - Campus Fix

Date: 2026-11-11

- Build a thin slice through every layer per feature, then verify before the next one.
- Server verified by `server/test/smoke.js` on a separate test database and port.
- App verified by type-check, Android bundle build, and a browser walkthrough with three sessions.
- Tricky parts: router-level guards leaking between routers (fixed by mounting `/admin` first); multipart upload differs between web and native (`report.tsx`); reward banners must not fire for history the user has already seen (`session.tsx` keeps a per-user marker).
