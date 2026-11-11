# Demo script (about 5 minutes)

## Before you start

1. `npm run seed` so the data is in its known starting state.
2. Server running in one terminal (`npm run server`), Expo in another (`npm run app`).
3. Both emulators open side by side, both on the login screen.
4. DB Browser for SQLite open on `server/campus.db`.

Emulator 1 is Alice. Emulator 2 is Ben, then the admin.

## The demo

| # | Time | What to do | What to say |
|---|---|---|---|
| 1 | 0:00 | On both: show the login screen | "Two emulators, different screen sizes, one shared server and database on my laptop." |
| 2 | 0:20 | Emulator 1: tap Student, Log in. Emulator 2: type `ben@campus.test`, password `Student123!`, Log in | "Every user has an account. Passwords are stored as bcrypt hashes." |
| 3 | 0:40 | Emulator 1: point at the feed | "Everyone sees every report. The most upvoted open problems are on top. The bar is a shared campus goal: one tick per fix." |
| 4 | 1:00 | Emulator 1: Report tab. Choose Projector & AV, Block A, room A105. Title "Projector will not switch on". Add a description, set High, take a photo. Send | "A report has a category, a location, a description and a status. There is no field for who should fix it. That is the staff's job." |
| 5 | 1:40 | Emulator 1: watch the banners | "Plus 5 points and the First Report badge. Gamification rewards contributing." |
| 6 | 1:50 | Emulator 2: tap Newest and wait | "Ben's phone picks up Alice's report by itself within 10 seconds." |
| 7 | 2:05 | Emulator 2: tap the upvote arrow, then tap it twice more | "Ben upvotes. Tapping again withdraws it, it never counts twice. The database has a primary key on user and issue, so a second vote is impossible." |
| 8 | 2:25 | Emulator 2: Report tab, choose Projector & AV and Block A | "If Ben tries to report the same thing, the app shows the existing report and asks him to upvote instead. Fewer duplicates for staff." |
| 9 | 2:45 | Emulator 2: Profile, Log out. Tap Admin, Log in. Open Manage | "The admin sees the numbers and a queue sorted by upvotes. Students cannot open this, and the server answers 403 if they try." |
| 10 | 3:05 | Emulator 2: open Alice's report. Type the note "Technician booked for Thursday". Mark as acknowledged | "Status moves one step at a time. The server refuses to skip a step." |
| 11 | 3:20 | Emulator 1: watch Alice's report | "Alice gets plus 15, and the note appears in her timeline. Most points only arrive when staff confirm a report is real, so spam earns nothing." |
| 12 | 3:40 | Emulator 2: Mark as in progress, then Mark as resolved | "In progress, then resolved." |
| 13 | 3:50 | Emulator 1: watch the banners, then open Profile and Leaderboard | "Plus 25 and a level-up to Spotter. Her profile shows the level, badges and every ledger entry." |
| 14 | 4:15 | DB Browser: Browse Data, show `issues`, `upvotes`, `point_events`. Show the `upvotes` primary key in Database Structure | "Reports persist in SQLite. Points are a ledger, the total is a SUM, and nothing is ever edited." |
| 15 | 4:40 | Terminal: `npm run smoke` (or show the last run) | "71 automatic checks, including the database refusing a duplicate upvote and data surviving a restart." |

## If something goes wrong

- **An emulator shows "Server not found".** Tap Try again. If that fails, run `adb -s <id> reverse tcp:4000 tcp:4000` and tap Try again.
- **The data looks wrong.** `npm run seed` resets it. Log out and in again on both emulators.
- **The camera does not open.** Use "Choose a photo", or send the report without one. The photo is optional.

## Points to make if there is time

- Dark mode: switch the emulator to dark theme and the app follows.
- Search and filters on the feed.
- The server terminal logs every request live as you tap.
