# Threat model and review - Campus Fix

Date: 2026-11-11

- **Auth:** bcrypt cost 10; JWT (7 days) in SecureStore; user re-read from the database on every request.
- **Authorisation:** `requireAdmin` on all `/admin` routes; students cannot report as admin, upvote their own report, or vote twice.
- **Input:** zod on every body; parameterised SQL; LIKE wildcards escaped; uploads limited to images, 5 MB, random file names.
- **Leaks:** password hash never returned; login gives the same message for unknown email and wrong password.
- **Accepted for a local demo:** open CORS, plain HTTP, a default JWT secret, no login rate limit. All four would change before any real deployment.
