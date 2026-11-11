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

### 20. What would you add with more time?
Push notifications when a report changes status, a campus map with pins, a web dashboard for staff, and rate limiting on login.
