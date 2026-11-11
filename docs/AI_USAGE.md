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

## Add-ons made during the competition

| Add-on | What changed | How it was checked |
|---|---|---|
| Comments on reports | New `comments` table, `POST /issues/:id/comments`, a comments section on the report screen, comment count on cards | 9 new smoke checks; browser walkthrough |
| Photo of the fix | `photo_path` on `status_history`, multipart support on the admin status route, before/after photos on the report screen | 5 new smoke checks; browser walkthrough |
| Database upgrade | `db.js` adds the new column to an existing database on start-up | 1 smoke check on an old-style database |

Bug caught while adding them: the comment count and the comment list were both called `comments`, so the screen would have overwritten one with the other. The type-checker caught it. The count was renamed to `commentCount`.

## Campus map and redesign (during the competition)

| Part | How it was checked |
|---|---|
| Building outlines traced from the official map | Drawn over the original image and compared by eye |
| Walkway network | A script checks that no walkway crosses a building and that every point can be reached |
| Routes | All 506 routes between every pair of places were computed: none missing, longest 523 m |
| Map screen, search, directions, 3D, "Report here", "Show on map" | Browser walkthrough, 14 of 14 |
| Live GPS location, follow-me directions, arrival, "Fix position" | Browser walkthrough with a simulated GPS position, 14 of 14 |
| Satellite view (react-native-maps) | Bundles for Android and iOS; needs a phone or emulator to see |
| Emergency screen from the MCAST poster | Every number checked against the poster by zooming into the photo |
| Full institute names on the map | A script checks that no two labels overlap |
| Departments table, filters and Manage grouping | 11 new smoke checks, including a forged department being ignored |
| Home, live weather, weather avatar, map weather | Browser walkthrough with a fake rain reading, 43 of 43; all 10 weathers and 4 seasons screenshotted and reviewed |
| 10 languages | A script checks 149 phrases in each language and every placeholder |
| Voice tour | Browser walkthrough; the voice itself must be heard on a phone |
| Glass redesign, haptics, mascot | Screenshots reviewed; earlier walkthroughs re-run (24/24 and 13/13) |

Bugs caught: several walkways first cut through buildings (found by the crossing check); searching "ICT" found nothing until everyday keywords were added; the first step of some routes said "turn after 4 m" until very short legs were merged.

## How the AI's work was checked

- `npm run smoke`: 97 of 97 checks pass, with both database drivers.
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
