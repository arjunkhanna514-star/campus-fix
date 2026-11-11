# ADR-003: Departments as a table; weather fetched on the phone

**Status:** Accepted  **Date:** 2026-11-11  **Feature:** home-weather-departments

## Context
Admins need reports sorted by the team that fixes them, without students assigning responsibility. Home and map need live weather at no cost.

## Decision
- New `departments` table; `categories.department_id` references it. The department is derived from the category on the server, never sent by the app. Older databases gain the column through the startup migration.
- Weather comes from Open-Meteo directly on the phone (no key, no server change), cached for 10 minutes, with a season and a manual preview for demos and offline use.

## Alternatives considered
| Alternative | Why not |
|---|---|
| Department as a free text column on issues | Students could pick it (breaks the brief) and values drift |
| Department mapping only in app code | Not visible in the database; filters could not be done in SQL |
| Weather proxied by our server | Adds a failure point; no benefit for a public, keyless API |

## Consequences
Filtering is one indexed join. If the phone is offline, weather falls back to the season and the preview still works.
