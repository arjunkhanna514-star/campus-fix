# ADR-001: A shared Express server with SQLite, and rules enforced in the database

**Status:** Accepted
**Date:** 2026-11-11
**Feature:** campus-fix
**Author:** 10x-Team (Architect + Staff Engineer)

## Context
The brief needs a mobile app with accounts, a database, reports visible to other students, one upvote per student, and an admin who changes status. It must be demonstrated on two Android emulators in one day, and everything may run on localhost. The rubric gives 20 marks for correct, well-structured database use.

## Decision
Use one Node/Express server on the laptop with a SQLite file. Both emulators talk to it over HTTP. Put the important rules in the schema itself: a composite primary key on `upvotes`, a CHECK on `issues.status`, and foreign keys. Derive the upvote count and the points total with COUNT and SUM instead of storing them.

## Alternatives Considered
| Alternative | Pros | Cons | Why Not |
|---|---|---|---|
| Firebase (Auth + Firestore) | No server to write, real-time out of the box | Needs internet and an account; rules are harder to show as constraints; NoSQL makes "one vote per user" a security-rule exercise | Venue Wi-Fi is a risk, and relational constraints are easier to demonstrate |
| SQLite on the phone only (expo-sqlite) | Simplest, no networking | Each emulator has its own data, so students cannot see each other's reports | Fails a core requirement |
| MySQL or SQL Server | Familiar relational databases | A separate service to install and run | More setup for no extra marks |

## Consequences

### Positive
- Two emulators share live data with no internet.
- The database file can be opened in DB Browser during the interview to show the constraints.
- Points are auditable and reversible.

### Negative
- The laptop must run the server during the demo.
- Updates arrive by 10-second polling, not instantly.

### Risks
- An emulator cannot reach the laptop. Mitigation: the app tries several addresses, has a manual address field, and `adb reverse` works as a fallback.
- The native SQLite driver fails to install. Mitigation: automatic fallback to `node:sqlite`.

## Dependencies
- Node 22.13 or newer.
- Constrains later choices: any real-time feature has to be added on top of HTTP.
