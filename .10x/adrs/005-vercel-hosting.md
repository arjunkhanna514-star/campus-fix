# ADR-005: Host on Vercel instead of Render

**Status:** Accepted
**Date:** 2026-11-11
**Feature:** hosting
**Author:** 10x-Team (Architect + DevOps)

## Context
The owner asked for Vercel. The server must run with the laptop off, for free.

## Decision
`vercel.json` serves the committed `app/dist` as static files and rewrites `/api/*`, `/uploads/*`, `/get`, `/qr.svg` and `/share-info` to `api/index.js`, which exports the Express app from `server/src/app.js`. `server/src/index.js` keeps the laptop behaviour (listen on a port). On Vercel the database and uploads live in `/tmp` (`DATA_DIR`).

## Alternatives Considered
| Alternative | Pros | Cons | Why Not |
|---|---|---|---|
| Render free web service | Long-running process | Sleeps after 15 min, about 1 min to wake | Owner chose Vercel; Vercel wakes in about a second |
| Vercel + hosted database (Turso/Neon) | Data persists | Rewrite of the data layer on competition day | Too risky today; noted as the next step |

## Consequences
Positive: no sleep delay, free, one import from GitHub. Negative: data in `/tmp` resets when a fresh function instance starts; two instances could briefly hold different data under heavy load.
