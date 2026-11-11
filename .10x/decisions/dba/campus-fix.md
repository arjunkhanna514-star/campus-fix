# Schema and data - Campus Fix

Date: 2026-11-11

- 7 tables, see `server/src/schema.sql`. Foreign keys and WAL mode switched on per connection.
- Constraints: UNIQUE email; CHECK on role, impact and status; composite PK on upvotes and user_badges.
- Indexes on issue status, category and reporter; upvotes by issue; ledger by user; history by issue.
- Ledger design for points: append-only, reversals are negative rows.
- Seed is deterministic in content and relative in time (days ago), so the demo looks current on any date.
- No migrations: the schema is `CREATE TABLE IF NOT EXISTS` and the demo data can be reset with `npm run seed`.
