# Fit District account backend

Express + PostgreSQL + Sequelize, using routes, controllers, services, models, middleware, validators, and versioned migrations. Implements verified accounts, sessions, editable profiles with BMI, progress journals/goals, counter-confirmed memberships, rotating gym QR attendance, and admin audit logs. Gym settings and Google OAuth remain upcoming backend phases.

## Configure and run

Use Node.js 22.19 or newer. The `dev` and `start` commands enable `--use-system-ca`, so TLS can validate certificate chains using the operating system's trusted certificate store as well as Node's bundled certificates. This fixes Windows SMTP connections with a locally trusted issuer while retaining certificate and hostname validation. No certificate is installed by the app. If starting manually, use `node --use-system-ca src/server.js`.

SMTP resolves the configured hostname through the operating system before each connection, preferring IPv4 when available and retaining IPv6 support. The original hostname is explicitly used for TLS server identity verification even when the connection uses a resolved IP address. This avoids stalled direct DNS lookups on Windows networks; it does not disable TLS or certificate checks.

1. Run `npm install`, then `npm run setup:env`. The setup script preserves an existing `.env` and generates four separate cryptographic keys for a new file.
2. Edit `.env` locally. Set `DATABASE_URL` to a dedicated PostgreSQL database and login you control. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, and `MAIL_FROM` for your email provider. Never paste passwords or keys into chat or commit `.env`.
3. Run `npm run migrate`, then `npm run dev`. The API listens on `127.0.0.1:3001`; it will refuse startup if configuration, database tables, or SMTP connectivity are unavailable. Restart after changing `.env`.
4. Run the React app from `../Frontend` with `npm run dev` and use **http://127.0.0.1:5173/register**. Restart Vite once after pulling this change so its API proxy takes effect. `/api` is proxied to the backend, keeping browser cookies on the frontend host. Use the configured host consistently; `localhost` and `127.0.0.1` are different origins.

For a local test without an email provider, explicitly set `MAIL_TRANSPORT=file`. Codes are then written to the ignored `.mailbox/<challengeId>.txt` files on this computer, never returned by the API or logged. **No email is sent in file mode; it does not prove mailbox ownership.** Production refuses file mode. Use SMTP to verify a real email address. Remove local captured messages when done testing.

The default frontend uses real authentication. The earlier dashboard sample mode is available only by explicitly setting `VITE_ENABLE_PREVIEW=true` in `Frontend/.env.local` and restarting Vite. It is development sample data, does not create backend accounts, and should remain off in production. Real logged-in accounts use backend identity and cannot select their role. Unimplemented gym actions are disabled for real accounts rather than changing sample/local records.

## Creating the tables in pgAdmin

As an alternative to `npm run migrate`, use the Query Tool connected to the database configured in `.env`. Execute the entire files in order: `sql/001-auth.sql`, `sql/002-gym.sql`, then `sql/003-progress.sql`. Each file contains SQL only and records its version in `schema_migrations`, so subsequent migrations skip it. Transactions apply the tables and migration records together; they never drop or replace existing tables. Do not paste the JavaScript migration wrapper into pgAdmin. If an earlier failed transaction is still open, run `ROLLBACK;` before retrying. If untracked tables already exist, inspect them before reconciling the migration history.

## Registration fields and rules

| Field          | Validation                                                                          |
| -------------- | ----------------------------------------------------------------------------------- |
| `fullName`     | Trimmed plain text, 2–100 characters; Unicode names allowed                         |
| `email`        | Valid email, normalized to lowercase, maximum 254 characters; aliases are preserved |
| `birthday`     | Real YYYY-MM-DD date, 1900 onward, on or before today in Asia/Manila                |
| `sex`          | `male`, `female`, or `prefer-not-to-say`                                            |
| `address`      | Trimmed plain text, 5–300 characters                                                |
| `phone`        | Optional leading +, 9–15 digits after stripping spaces, parentheses, and hyphens    |
| `weight`       | JSON number, 20–500 kg                                                              |
| `height`       | JSON number, 50–250 cm                                                              |
| `membership`   | `monthly`, `quarterly`, `half-year`, `annual`, or `day`                             |
| `rateCategory` | `student` or `nonStudent`                                                           |
| `password`     | 12–128 characters, preserved exactly; spaces allowed                                |

Unknown request fields are rejected, including `role`, status, member IDs, BMI, and activation/payment fields. The server assigns role `user`. Preferred membership is recorded as a request; it grants **no active access**. Admin activates access after confirming counter payment.

The signup request stores encrypted pending details and an Argon2id password hash, not a user account. The code is six random digits, HMAC-bound to the challenge, expires after ten minutes, and is bound to an HttpOnly signup cookie and CSRF context. Five wrong attempts exhaust a challenge. Resend has a 60-second cooldown, preserves the attempt budget, invalidates the old code, and permits five sends/hour/recipient. Login failures and code failures also have database-backed recipient limits across browser/IP changes. Neutral signup responses prevent revealing whether an account already exists; existing accounts or other browsers’ pending signups cannot have their details/password replaced.

Correct verification atomically consumes the challenge, creates the verified user/profile and starting weight journal entry, and issues the session cookies. The frontend immediately opens the user dashboard. If SMTP delivery fails, no user is created and a rate-limited resend is available.

## API

All mutation requests use JSON, the exact `Origin` configured in `.env`, and `X-CSRF-Token`. Get the token from `/auth/csrf` with cookies enabled. API responses never include passwords, verification codes, or authentication tokens.

| Method | Path under `/api/v1` | Purpose                                                      |
| ------ | -------------------- | ------------------------------------------------------------ |
| GET    | `/health`            | Service availability                                         |
| GET    | `/auth/csrf`         | Bootstrap signed browser CSRF context                        |
| POST   | `/auth/signup`       | Validate pending signup and send verification code           |
| POST   | `/auth/verify-email` | `{challengeId, code}`; create account and sign in atomically |
| POST   | `/auth/resend-code`  | `{challengeId}`; resend subject to cooldown/budgets          |
| POST   | `/auth/login`        | `{email, password}`; sign in with stored password hash       |
| POST   | `/auth/refresh`      | Rotate opaque refresh token; reuse revokes the session       |
| POST   | `/auth/logout`       | Revoke session and clear cookies                             |
| GET    | `/auth/me` or `/me`  | Current authenticated account and own profile                |
| PUT    | `/me/profile`        | Update only the authenticated user’s allowed profile fields  |

BMI is calculated on the server as `weightKg / (heightCm / 100)²`, rounded to one decimal. Profile update accepts seven profile fields (`fullName`, `birthday`, `sex`, `address`, `phone`, `weight`, `height`) and an optional positive `version`; the frontend supplies the returned `profileVersion` to reject stale saves. Email/role/membership changes are not included. Body metrics, address, birthday, sex, phone, and full name are encrypted together with AES-256-GCM at rest. Authentication and rate-limit tables contain no raw email codes or refresh credentials.

Access JWTs last 15 minutes. Sessions have a seven-day absolute expiry; refresh tokens rotate with consumed hashes retained until that expiry for replay detection. Cookie authentication uses HttpOnly, SameSite=Lax, host-only cookies, Secure in production, strict Origin checks, and signed double-submit CSRF plus session binding. Every protected request checks current verification, enabled state, session expiry/revocation, and server role. Client route guards supplement these backend checks.

Helmet, bounded JSON bodies, shared validation, safe errors/request IDs, parameterized ORM/SQL, IP limits, and persistent recipient counters are included. IP rate-limit state is per process: run **one API process** until a shared limiter store is introduced. Production requires HTTPS and validated PostgreSQL TLS. Configure trusted proxy hops for your actual deployment. The host serving React must also set document security headers; API Helmet headers alone do not protect that document. Keep encryption keys backed up privately; losing them loses access to encrypted profiles. Implement key rotation before a production rollout.

## Testing and maintenance

- `npm test`: validation, password hashing, encryption integrity, BMI, and permission field rejection.
- `npm run test:postgres`: Windows PostgreSQL API tests using a fresh, password-protected local fixture instance on a free loopback port. Defaults to PostgreSQL 18 at `C:\Program Files\PostgreSQL\18\bin`; set `PG_BIN` for another installation. This does not use or change the installed PostgreSQL service/database. Fixture data stays in ignored `.test-postgres/` and the fixture server stops afterward. The runner lock serializes fixture runs and recovers orphaned fixture instances.
- `npm run test:integration`: API tests against a **fresh local database whose name ends in `_test`**, configured only through `TEST_DATABASE_URL`. It refuses nonlocal/test URLs and does not clear an existing database.
- `node scripts/cleanupAuth.js`: remove old pending challenges, expired counters, and expired sessions. Arrange scheduling in your deployment; refresh history remains until absolute session expiry.
- `npm run admin`: trusted initial administrator setup in an interactive local terminal. No default admin/password exists; passwords are entered without echo. This operator-created account is outside public signup. Do not give server terminal access to untrusted users.

Dependency versions are pinned. The Sequelize `uuid` dependency is overridden to patched CommonJS-compatible `11.1.1`; migrations and transaction behavior are checked against PostgreSQL.

## Memberships, attendance, and audit

Run `npm run migrate` to apply the additive migrations, then restart the API. For pgAdmin, run the three complete SQL files in order as described above. Existing users and profiles are preserved.

Admin activates access only after confirming counter payment. The backend sets the start date to today in Asia/Manila, calculates the exclusive end date, and chooses the official student/non-student rate. Rates supplied by a browser are rejected. One current access is supported; renewal replaces it and preserves its history. A daily pass permits one admission during its selected morning (07:00–before 12:00) or afternoon (12:00 onwards) window. Time-in consumes the admission, not time-out.

Admin opens **Attendance** and displays the gym QR. It refreshes every minute and expires after 90 seconds. Members open **My attendance** and scan to time in or out. The server verifies the signed purpose, expiry, and active issuing admin session, then derives the member from the authenticated account. Logout or disabling the issuing admin invalidates the QR. Times come from the server. Users cannot submit another member’s ID or a custom timestamp. Time-out is allowed for an existing visit even if the member’s access subsequently expires or is suspended. There are no admin manual time-in/time-out endpoints or buttons.

Each scan and membership activation has a UUID request ID. Transactions, row locks, a unique open-visit index, and stored responses make concurrent retries safe. A retry of a committed scan returns the original result, even if the QR has since expired; a new scan must use a currently valid QR. Explicit time-in/time-out actions prevent a repeated camera frame from toggling attendance. Admin attendance refreshes every five seconds and provides paginated complete history. Dashboard snapshots are limited to 1,000 members and recent visits, with a visible notice when this limit is reached.

Camera access requires HTTPS for phones or localhost for development. Both servers default to loopback only. A phone deployment needs a reachable HTTPS frontend and correctly configured API proxy/origin; changing Vite’s host alone does not make camera access work. QR photos are decoded locally in the browser and are never uploaded. A rotating QR limits the lifetime of a shared image but is not proof of physical presence.

Audit logs include verified account creation, successful login/logout, profile changes, progress creation/edits, goal changes, membership activation/status changes, and QR attendance. They store identifiers and selected action details, without passwords, codes, QR tokens, email addresses, notes, or body measurements. Domain mutations and their audits commit together. The log is admin-only and protected against UPDATE, DELETE, and TRUNCATE by a PostgreSQL trigger; a database owner can still change schema protections. Direct operator SQL edits and failed sign-ins are not recorded in this application log. Restrict database privileges in production.

| Method | Path under `/api/v1/gym`                                                 | Access                                                                       |
| ------ | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| GET    | `/state`                                                                 | Admin gym snapshot / user own records                                        |
| GET    | `/attendance?scope=today\|inside\|all&date=YYYY-MM-DD&limit=25&offset=0` | Admin all / user own visits                                                  |
| GET    | `/attendance/qr`                                                         | Admin only                                                                   |
| POST   | `/attendance/scan`                                                       | User only: `{requestId, token, action: "time-in" or "time-out"}`             |
| POST   | `/members/:id/access`                                                    | Admin: `{requestId, planId, rateCategory, paymentConfirmed:true, timeSlot?}` |
| PUT    | `/members/:id/access/status`                                             | Admin: `{status:"active" or "suspended"}`                                    |
| GET    | `/audit?limit=25&offset=0&action=…&date=YYYY-MM-DD`                      | Admin only                                                                   |

The isolated PostgreSQL suite verifies authorization, malformed input, counter confirmation, server rates, expiry, QR forgery/expiry/revocation, concurrent scan retries, single-admission daily passes, ownership, and append-only audit storage. Browser QA can use `powershell -File scripts/testPostgres.ps1 -Browser -ApiPort 3002 -FrontendOrigin http://127.0.0.1:5174 -SeedGym` with a separate frontend (`API_PROXY_TARGET=http://127.0.0.1:3002`, port 5174). Its seed refuses every non-test or nonempty database and creates only fictional accounts; no real emails or counter payments occur.

## Progress and profile synchronization

Migration `003-progress` adds encrypted journals and goals plus profile versions. No historical measurements are invented for existing accounts. New verified registrations start with their provided weight, dated today in Asia/Manila. Existing members can record their first measurement or change their profile weight.

Users can read only their own records and edit only entries originally recorded for themselves. Admin can choose a member, view their journal/goals, and record or edit measurements. The original author remains visible after an edit. Both roles can set member-scoped goals under the same ownership checks. Membership activation is not required to maintain a profile or journal.

Allowed metrics are `Weight` (20–500 kg), `Bench press` (0.1–1,000 kg), and `Waist` (20–300 cm). Dates must be real calendar dates from 1900 through today; notes are plain text up to 500 characters. Unknown fields, supplied units/authors, invalid values, and other users' member IDs are rejected. Values/notes and goal targets/baselines use AES-256-GCM with separate purpose-bound authenticated data.

The latest weight by measurement date updates the profile weight and BMI. For entries on the same day, the last recorded entry wins. Backdated measurements do not replace a later weight. Saving a different profile weight adds one entry dated today; changing other profile details does not add duplicate measurements. Member/profile locks and version checks protect concurrent edits, and an audit failure rolls back the entire change. Measurement edits require their current `version`; changing an existing goal requires its current version. Create/goal UUID request IDs make retries idempotent without storing plaintext measurements in cached responses.

| Method | Path under `/api/v1/gym`                                  | Body / result                                                                                    |
| ------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| GET    | `/progress?memberId=UUID&metric=Weight&limit=25&offset=0` | User's own journal / admin-selected member; entries, total, selected metric chart/summary, goals |
| POST   | `/progress`                                               | `{memberId,requestId,metric,value,date,notes}`                                                   |
| PUT    | `/progress/:id`                                           | `{metric,value,date,notes,version}`                                                              |
| POST   | `/goals`                                                  | `{memberId,requestId,metric,target,version?}`                                                    |

The journal paginates the complete history (default 25, maximum 100 per page). Charts show the latest 200 measurements; first/latest/count summaries use the full history. Dashboard snapshots include up to 1,000 recent progress entries across loaded members, while the dedicated progress screen uses the paginated API. Goals capture the latest measurement as their baseline when a target changes, supporting either an increase or decrease. The API suite verifies encryption, ownership, idempotency, edits, profile/BMI synchronization, stale forms, bounded charts, complete summaries, and transaction rollback.
