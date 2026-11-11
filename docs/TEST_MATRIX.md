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
| 15 | A student and the admin can both comment; staff comments are labelled; a 1-letter comment is refused | ☐ | ☐ |
| 16 | Admin resolves a report with a photo of the fix; the student sees Before and After | ☐ | ☐ |
| 17 | Map: drag, pinch, + and −, 3D and Re-centre all work | ☐ | ☐ |
| 18 | Map: search "library", get directions; the route draws and the steps make sense | ☐ | ☐ |
| 19 | Buttons and tabs vibrate; screens slide in | ☐ | ☐ |
| 20 | SOS on the feed opens Emergency help; tapping a number opens the dialler with it filled in | ☐ | ☐ |
| 21 | Set the emulator location to Block M (35.876811, 14.505382): the map says "You are here, Block M" | ☐ | ☐ |
| 22 | Directions to MRC Library from Your location, then move the location to 35.876799, 14.506315: "You have arrived" | ☐ | ☐ |
| 23 | Globe button shows satellite imagery with the route on top | ☐ | ☐ |
| 24 | Zoom in: full institute names appear and do not overlap | ☐ | ☐ |
| 25 | Log in: the app opens on Home with the weather card and the mascot dressed for today's weather | ☐ | ☐ |
| 26 | Preview the weather: pick Rain, Snow, Sunny; the mascot and the animation change, and the map shows the same weather | ☐ | ☐ |
| 27 | Issues, Filters, IT Services: only IT reports; add Block A: only IT reports in Block A | ☐ | ☐ |
| 28 | Admin, Manage: reports grouped by department; tap a department tile to see only those | ☐ | ☐ |
| 29 | Language button: choose Italiano; tabs, Home, map and emergency change; choose English again | ☐ | ☐ |
| 30 | Start the tour, tap Listen: a voice reads each step and moves on; Try it opens the feature | ☐ | ☐ |
| 31 | Watch the background for a minute and switch tabs: the spheres keep drifting and never jump back | ☐ | ☐ |
| 32 | Map, globe button: real satellite photos; choose a block and tap Directions: the walking route shows | ☐ | ☐ |

## Already checked automatically

These ran before the emulator test and all passed.

| Check | Result |
|---|---|
| `npm run smoke` (API, database rules, restart, comments, fix photo, database upgrade) | 97 of 97 |
| `npm run smoke` with the built-in SQLite driver | 97 of 97 |
| `npm run typecheck` | No errors |
| Android bundle build (`expo export --platform android`) | Built |
| Three-screen browser walkthrough: two students and an admin | 24 of 24 |
| Add-on walkthrough: comments and photo of the fix | 13 of 13 |
| Live location and emergency walkthrough (simulated GPS) | 14 of 14 |
| Home, weather, departments, languages and tour walkthrough | 43 of 43 |
| Translations check (149 phrases x 9 languages, placeholders) | 0 problems |
| Map walkthrough | 14 of 14 |
| Satellite view (Google embed, place, directions, no rain over photos) | 10 of 10 |
| Wallpaper keeps moving (sampled every second for 14 s) | 13 of 13 |
| Every screen, 2 sizes x 3 languages x both roles (`sweep`) | 114 screens, 0 problems |
| Android bundle build (`expo export --platform android`) | Built |
| iOS bundle build (`expo export --platform ios`) | Built |
| Screenshots at 360, 393, 800 and 1366 px wide, light and dark | Reviewed |

Not yet done by anyone: rows 1 to 16 on real Android emulators. Fill them in.
