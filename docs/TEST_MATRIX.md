# Test matrix

Run every row on **both** Android emulators and tick the boxes. This is the proof for "works well on at least 2 emulator devices".

Emulator 1: ____________________  Emulator 2: ____________________  Date: __________

| # | Check | Emulator 1 | Emulator 2 |
|---|---|---|---|
| 1 | Register a new account, log out, log in. Close and reopen the app: still logged in | ☐ | ☐ |
| 2 | A wrong password shows "Email or password is incorrect." | ☐ | ☐ |
| 3 | Report with a photo, report without a photo, and a missing field is blocked with a message | ☐ | ☐ |
| 4 | A report made on one emulator appears on the other within 10 seconds | ☐ | ☐ |
| 5 | Upvote works. Tapping again withdraws it. Your own report cannot be upvoted | ☐ | ☐ |
| 6 | "Most upvoted" order changes after votes | ☐ | ☐ |
| 7 | Admin moves a report through all 4 statuses. There is no way to skip a step | ☐ | ☐ |
| 8 | A student account has no Manage tab | ☐ | ☐ |
| 9 | Points, level, badges and leaderboard update after reporting and upvoting | ☐ | ☐ |
| 10 | Duplicate warning appears on the report form. Search and filters work | ☐ | ☐ |
| 11 | Dark mode and rotating the screen do not break any layout | ☐ | ☐ |
| 12 | Stop and restart the server: all reports are still there | ☐ | ☐ |
| 13 | The keyboard does not cover the field being typed in (login, report, admin note) | ☐ | ☐ |
| 14 | No text is cut off on the smaller emulator | ☐ | ☐ |

## Already checked automatically

These ran before the emulator test and all passed.

| Check | Result |
|---|---|
| `npm run smoke` (API, database rules, restart) | 71 of 71 |
| `npm run smoke` with the built-in SQLite driver | 71 of 71 |
| `npm run typecheck` | No errors |
| Android bundle build (`expo export --platform android`) | Built |
| Three-screen browser walkthrough: two students and an admin | 24 of 24 |
| Screenshots at 360, 393, 800 and 1366 px wide, light and dark | Reviewed |

Not yet done by anyone: rows 1 to 14 on real Android emulators. Fill them in.
