# How AI was used in this project

The brief allows AI and asks me to understand what it produced. This file is the honest record.

## What Claude did

| Part | What Claude produced |
|---|---|
| Plan | Turned the brief and rubric into a build plan with a task list and checks (`input/ideas/campus-issue-reporter-plan.md`) |
| Server | All files in `server/src/`: schema, database setup, login, reports, upvotes, admin status changes, points and badges, demo data |
| Tests | `server/test/smoke.js`, 71 checks against the real API |
| App | All screens and components in `app/`, the colour and type system, the app icon |
| Docs | First drafts of the architecture notes, judge questions and demo script |

## Decisions that came from the brief, not from the AI

- A shared server, because students must see each other's reports on two emulators.
- Students cannot assign who fixes a problem. Only an admin changes status.
- Exactly four statuses, moved one step at a time.
- One upvote per student per problem.

## Bugs the AI introduced, and how they were caught

1. **Admin guard leaking onto student routes.** The first version attached the admin-only check to a router mounted at the root, which would have blocked students from their own profile. Caught by reading the code before running it. Fixed by mounting the admin routes under `/admin` and loading them first (`server/src/index.js`).
2. **Tab bar labels cut off.** The bottom bar was too short for an icon plus a label. Caught by taking screenshots and measuring the bar. Fixed in `app/app/(tabs)/_layout.tsx`.
3. **Uneven cards on tablets.** In the two-column layout, cards in the same row had different heights. Caught in the tablet screenshot. Fixed with the `fill` option in `IssueCard.tsx`.
4. **Cramped admin tiles on small phones.** "Acknowledged" was cut to "Acknowle...". Caught in the phone screenshot. Fixed by switching to a 2 x 2 grid on narrow screens.
5. **Upvote button on your own report.** It showed a dimmed button that could never work. Removed; the screen now just explains why.

## How the AI's work was checked

- `npm run smoke`: 71 of 71 checks pass, with both database drivers.
- The app's TypeScript compiles with no errors, and the Android bundle builds.
- A three-screen walkthrough in a browser (two students and an admin) passed 24 of 24 steps: report with photo, live update on the second screen, upvote, duplicate warning, all four status steps, rewards and level-up.
- Screenshots were reviewed at small-phone, phone, tablet and laptop sizes, in light and dark mode.

## Changes from the original plan

- **No React Native Paper.** The plan named it, but its stock Material look made the app feel like a template. The buttons, chips and inputs are written by hand in `app/src/components/ui.tsx`.
- **Automatic database fallback.** If `better-sqlite3` cannot load, the server uses the SQLite built into Node without any change.

## My own checks (fill this in as you go)

Write these in your own words. The judges will ask.

| Date | What I ran or read | What I found |
|---|---|---|
| | Ran the app on emulator 1 | |
| | Ran the app on emulator 2 | |
| | Opened `campus.db` in DB Browser and tried a duplicate upvote | |
| | Read `server/src/routes/issues.js` and explained `addUpvote` out loud | |
| | Read `server/src/gamification.js` and explained the points rules | |
| | Changed something myself (what and why) | |
