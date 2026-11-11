# Security review - 2026-11-11

| Check | Result |
|---|---|
| Passwords hashed (bcrypt), hash never returned | Pass |
| Every route except /health, /auth and /uploads needs a valid token | Pass |
| Admin routes reject students (403) | Pass, covered by the smoke test |
| Student cannot upvote twice, upvote own report, or change status | Pass |
| SQL built only with placeholders; injection string in search is harmless | Pass |
| Uploads: images only, 5 MB, random names | Pass |
| Input validated with zod on every body | Pass |

**Accepted for a localhost demo, to fix before any real use:** open CORS, plain HTTP, default JWT secret, no login rate limit, uploaded photos readable without a token.
