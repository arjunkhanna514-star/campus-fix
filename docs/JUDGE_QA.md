# Questions the judges might ask

Short answers, with the file to open for each. Read these out loud until you can say them without looking.

### 1. How do you stop a student upvoting the same problem again and again?
Two layers. The API checks for an existing upvote and answers 409. Under that, the `upvotes` table has a primary key on `(user_id, issue_id)`, so the database itself refuses a second row. The app could be broken and the rule would still hold.
Files: `server/src/schema.sql`, `addUpvote` in `server/src/routes/issues.js`.

### 2. Where is the upvote count stored?
It is not stored. Every query counts rows in `upvotes`. A stored number could go out of step; a count cannot.
File: `ISSUE_SELECT` in `server/src/routes/issues.js`.

### 3. How are passwords stored?
As bcrypt hashes. bcrypt is slow on purpose and adds a random salt, so two users with the same password get different hashes. The plain password is never saved or sent back.
File: `server/src/routes/auth.js`.

### 4. How does the server know who is making a request?
Logging in returns a JWT, a signed token holding the user id and role. The app sends it in the `Authorization` header. `requireAuth` verifies the signature and loads the user.
Files: `server/src/middleware/auth.js`, `app/src/api.ts`.

### 5. What stops a student from changing a status?
`requireAdmin` on every `/admin` route answers 403 unless the role is admin. The app hides the Manage tab too, but that is only for looks. The smoke test proves a student token gets 403.
File: `server/src/middleware/auth.js`.

### 6. Can an admin skip from Reported straight to Resolved?
No. The server accepts only the next status in the list `NEXT_STATUS`. Anything else gets a 400.
Files: `server/src/config.js`, `changeStatus` in `server/src/routes/admin.js`.

### 7. What if two admins change the same report at the same moment?
The update says `WHERE id = ? AND status = <old status>`. The second admin's update matches no rows, so the server answers 409 and tells them to refresh.
File: `changeStatus` in `server/src/routes/admin.js`.

### 8. Why did you use a server and SQLite instead of Firebase?
I wanted a real relational database where I can show the rules as constraints, and I wanted everything to run on the laptop with no internet. SQLite is one file, so it is easy to open and inspect in the demo.

### 9. Why a server at all? Why not SQLite on the phone?
Students must see each other's reports. A database on one phone is invisible to the other. The data has to live in one shared place.

### 10. What is a transaction and where do you use one?
A group of database writes that either all happen or none happen. Creating a report writes the report, its first history row and a points row. If the third write failed, I would not want a report with no points, so all three are in one transaction.
File: `transaction` in `server/src/db.js`.

### 11. How does the gamification encourage good behaviour and not spam?
Submitting pays only 5 points. The other 40 arrive when an admin acknowledges the report (+15) and when it is resolved (+25). A fake report is never acknowledged, so it earns almost nothing. Upvoting an existing report instead of filing a duplicate also pays a point.
File: `server/src/gamification.js`.

### 12. Can someone farm points by upvoting and un-upvoting?
No. Withdrawing an upvote adds negative rows to the ledger for both students, so the net is zero.
File: `removeUpvote` in `server/src/routes/issues.js`.

### 13. How does one emulator see what the other one did?
Both talk to the same server. The feed, the report screen and the profile re-read their data every 10 seconds while they are on screen. It is simple polling.
Files: `app/app/(tabs)/index.tsx`, `app/src/session.tsx`.

### 14. Why polling and not WebSockets?
Polling is a few lines, has nothing to reconnect, and a 10-second delay is fine for campus maintenance. With more time I would add push notifications for status changes.

### 15. How does the emulator reach the server on the laptop?
Inside an Android emulator, `localhost` means the emulator itself. The address `10.0.2.2` is the emulator's name for the laptop. The app tries a few addresses and uses the first one that answers `/health`.
File: `candidateUrls` in `app/src/api.ts`.

### 16. How do you protect against SQL injection?
Every user value goes into SQL through `?` placeholders, so it is treated as data and never as SQL. Sort order is chosen from a fixed list, not taken from the request. The smoke test sends `'; DROP TABLE issues; --` as a search and the table is still there.
File: `GET /issues` in `server/src/routes/issues.js`.

### 17. How are photos handled?
The app sends the photo as multipart form data. The server accepts only images up to 5 MB, saves the file under a random name, and stores only the path in the database.
File: `server/src/routes/issues.js` (the `multer` setup at the top).

### 18. Why can't a student choose who fixes the problem?
The task says the student app is for reporting and highlighting, not assigning work. The form has no such field and the database has no such column. Only an admin changes status.

### 19. Which parts did AI write, and how did you check them?
See `docs/AI_USAGE.md`. In short: Claude generated the code from a plan I approved. I checked it with the 71-check smoke test, the two-emulator test matrix, and by reading each file until I could explain it.

### 20. How do comments work, and can they be abused for points?
Each comment is a row in the `comments` table linked to the report and the user. Comments earn no points, so posting lots of them gives nothing. The length is limited to 500 characters, checked by the API and by the database.
Files: `server/src/schema.sql`, `POST /issues/:id/comments` in `server/src/routes/issues.js`.

### 21. How does the photo of the fix work?
When the admin marks a report resolved, the app sends the status change as a form with the photo. The server saves the file and stores its path on that `status_history` row. It refuses a photo on any step other than Resolved. The student then sees "Before" and "After the fix" side by side.
File: `PATCH /issues/:id/status` in `server/src/routes/admin.js`.

### 22. You added a column after the database already existed. How?
`db.js` runs a small migration on start-up: it reads the columns with `PRAGMA table_info(status_history)` and, if `photo_path` is missing, runs `ALTER TABLE ... ADD COLUMN`. Existing rows are kept. The smoke test checks this on an old-style database.
File: `server/src/db.js`.

### 23. How does the campus navigation work?
The map is traced from the official MCAST map and stored as coordinates in `campus.json`. Walkways are a graph of points and links. When you ask for directions, Dijkstra's algorithm finds the shortest path along the walkways, and the app turns each sharp bend into a step. Time is distance divided by an average walking speed of 80 m per minute.
Files: `app/src/navigation.ts`, `app/src/campus.json`.

### 24. How accurate are the distances?
They are estimates. I set the scale from the map's proportions, about 0.33 m per pixel, so the whole campus is roughly 440 m across. With a surveyed plan, I would only need to change that one number.

### 25. How does the map connect to the reports?
Reports store the building by the same name the map uses, like "Block M" or "MRC Library". So the map can count open problems per block, "Report here" pre-fills the building, and each report has "Show on map".

### 26. What would you add with more time?
Push notifications when a report changes status, a campus map with pins, a web dashboard for staff, and rate limiting on login.

### 27. How does the app know where I am on campus?
The phone's GPS gives latitude and longitude. I convert that to a point on my map using MCAST's published coordinate and the map's scale, then test which building outline contains the point. GPS can be 5 to 15 m out, so "Fix position" lets you tap the building you are standing at and the app corrects the offset from then on.

### 28. Does navigation work while walking?
Yes. The app listens for position updates every 2 m. Each update recalculates the shortest route from where you are, the map follows you, and when you reach the door or step inside the building it says "You have arrived".

### 29. Where does the satellite view come from?
`react-native-maps`, which uses Apple Maps on iPhone and Google Maps on Android, so it costs nothing in Expo Go. The route and buildings from my own map are drawn on top by converting map pixels back to GPS.

### 30. Why is there an emergency screen in an issue reporter?
MCAST already runs a "Spot it. Report it." safety poster with emergency numbers. Students who open the app because something is dangerous need those numbers faster than a report. Every number is copied from the poster and opens the phone's dialler; "Share my location" sends your block and GPS in a message.

### 31. Can students misuse the location?
Location never leaves the phone unless the student taps "Share my location", and then it goes only where they send it. The server never stores it.

### 32. How do admins avoid a messy list of reports?
Every category belongs to a department (IT Services, Estates & Maintenance, Cleaning Services, Health & Safety, Student Services) in the database. Manage groups the queue under each department with a count, and one tap narrows it to one department. Students can filter the same way, plus by building.

### 33. Doesn't a department mean students assign responsibility?
No. Students only pick what kind of problem it is. The department comes from the category on the server, through `categories.department_id`. A smoke test sends a forged department with a report and checks the server ignores it.

### 34. Where does the weather come from, and is it really live?
From Open-Meteo, a free weather service with no sign-up, for MCAST Paola's coordinates, refreshed every 10 minutes. The card says "Live weather" when it is live. Without internet it shows the season instead, and "Preview the weather" can show any weather for a demo.

### 35. How many languages, and how did you make sure none is broken?
Ten. Every screen asks for its words through one function, so switching language changes the whole app at once. A script checks that every language has all 149 phrases and keeps placeholders like {name}. If a phrase were missing, English would show instead of a blank.

### 36. How does the voice tour pick a male voice?
It asks the phone for its voices and picks one in the chosen language whose name is a known male voice. If the phone has none, it uses the default voice at a lower pitch. The voice depends on the phone; the tour also works without sound.

### 37. How can anyone install it without the App Store?
The same code also builds as a web app, which the server hosts next to the API. `npm run share` gives the laptop a free public https link (a Cloudflare quick tunnel) and prints a QR code. Scanning it opens Campus Fix in the phone's browser, and Add to Home Screen installs it with its own icon, full screen. That works on iPhone, Android and any phone with a browser. The app on the emulators still uses the native build (Expo).

### 38. Why does the background move, and does it drain the battery?
It is one small picture (110 KB), not a video, moved with a slow zoom and drift. The movement uses the phone's native animation driver, runs from one shared clock so it never restarts, pauses on screens that are not visible, and becomes still when the phone's "reduce motion" setting is on.

### 39. Is the satellite view really Google's?
On the web and in the Android APK it is Google's official free map embed (no key needed) in satellite mode, centred on the chosen block or on you, with Google's walking directions when a route is open. On iPhone it is Apple's satellite map and in Expo Go on Android it is Google's native map, both with our route and markers on top.

### 40. Does it work when your laptop is off?
Yes: it is hosted on Vercel's free plan. The web app is served as static files and the same Express server runs as a serverless function (`api/index.js` loads `server/src/app.js`; the laptop uses `server/src/index.js`, which only adds a port). The phone app tries the laptop first and falls back to the hosted address. The trade-off is that free functions have no permanent disk, so the SQLite file lives in `/tmp` and resets to the demo data when Vercel starts a fresh copy.

