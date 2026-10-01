# Fit District account backend

Express + PostgreSQL + Sequelize, using routes, controllers, services, models, middleware, validators, and versioned migrations. This phase implements email/password registration, email verification, automatic sign-in, login, session renewal/logout, and the member’s own profile with BMI. Gym operations and Google OAuth are separate upcoming backend phases.

## Configure and run

1. Run `npm install`, then `npm run setup:env`. The setup script preserves an existing `.env` and generates four separate cryptographic keys for a new file.
2. Edit `.env` locally. Set `DATABASE_URL` to a dedicated PostgreSQL database and login you control. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, and `MAIL_FROM` for your email provider. Never paste passwords or keys into chat or commit `.env`.
3. Run `npm run migrate`, then `npm run dev`. The API listens on `127.0.0.1:3001`; it will refuse startup if configuration, database tables, or SMTP connectivity are unavailable. Restart after changing `.env`.
4. Run the React app from `../Frontend` with `npm run dev` and use **http://127.0.0.1:5173/register**. Restart Vite once after pulling this change so its API proxy takes effect. `/api` is proxied to the backend, keeping browser cookies on the frontend host. Use the configured host consistently; `localhost` and `127.0.0.1` are different origins.

For a local test without an email provider, explicitly set `MAIL_TRANSPORT=file`. Codes are then written to the ignored `.mailbox/<challengeId>.txt` files on this computer, never returned by the API or logged. **No email is sent in file mode; it does not prove mailbox ownership.** Production refuses file mode. Use SMTP to verify a real email address. Remove local captured messages when done testing.

The default frontend uses real authentication. The earlier dashboard sample mode is available only by explicitly setting `VITE_ENABLE_PREVIEW=true` in `Frontend/.env.local` and restarting Vite. It is development sample data, does not create backend accounts, and should remain off in production. Real logged-in accounts use backend identity and cannot select their role. Unimplemented gym actions are disabled for real accounts rather than changing sample/local records.

## Registration fields and rules

| Field | Validation |
| --- | --- |
| `fullName` | Trimmed plain text, 2–100 characters; Unicode names allowed |
| `email` | Valid email, normalized to lowercase, maximum 254 characters; aliases are preserved |
| `birthday` | Real YYYY-MM-DD date, 1900 onward, on or before today in Asia/Manila |
| `sex` | `male`, `female`, or `prefer-not-to-say` |
| `address` | Trimmed plain text, 5–300 characters |
| `phone` | Optional leading +, 9–15 digits after stripping spaces, parentheses, and hyphens |
| `weight` | JSON number, 20–500 kg |
| `height` | JSON number, 50–250 cm |
| `membership` | `monthly`, `quarterly`, `half-year`, `annual`, or `day` |
| `rateCategory` | `student` or `nonStudent` |
| `password` | 12–128 characters, preserved exactly; spaces allowed |

Unknown request fields are rejected, including `role`, status, member IDs, BMI, and activation/payment fields. The server assigns role `user`. Preferred membership is recorded as a request; it grants **no active access**. Admin activation after counter payment is a later endpoint.

The signup request stores encrypted pending details and an Argon2id password hash, not a user account. The code is six random digits, HMAC-bound to the challenge, expires after ten minutes, and is bound to an HttpOnly signup cookie and CSRF context. Five wrong attempts exhaust a challenge. Resend has a 60-second cooldown, preserves the attempt budget, invalidates the old code, and permits five sends/hour/recipient. Login failures and code failures also have database-backed recipient limits across browser/IP changes. Neutral signup responses prevent revealing whether an account already exists; existing accounts or other browsers’ pending signups cannot have their details/password replaced.

Correct verification atomically consumes the challenge, creates the verified user/profile, and issues the session cookies. The frontend immediately opens the user dashboard. If SMTP delivery fails, no user is created and a rate-limited resend is available.

## API

All mutation requests use JSON, the exact `Origin` configured in `.env`, and `X-CSRF-Token`. Get the token from `/auth/csrf` with cookies enabled. API responses never include passwords, verification codes, or authentication tokens.

| Method | Path under `/api/v1` | Purpose |
| --- | --- | --- |
| GET | `/health` | Service availability |
| GET | `/auth/csrf` | Bootstrap signed browser CSRF context |
| POST | `/auth/signup` | Validate pending signup and send verification code |
| POST | `/auth/verify-email` | `{challengeId, code}`; create account and sign in atomically |
| POST | `/auth/resend-code` | `{challengeId}`; resend subject to cooldown/budgets |
| POST | `/auth/login` | `{email, password}`; sign in with stored password hash |
| POST | `/auth/refresh` | Rotate opaque refresh token; reuse revokes the session |
| POST | `/auth/logout` | Revoke session and clear cookies |
| GET | `/auth/me` or `/me` | Current authenticated account and own profile |
| PUT | `/me/profile` | Update only the authenticated user’s allowed profile fields |

BMI is calculated on the server as `weightKg / (heightCm / 100)²`, rounded to one decimal. Profile update accepts the seven profile fields only (`fullName`, `birthday`, `sex`, `address`, `phone`, `weight`, `height`); email/role/membership changes are not included. Body metrics, address, birthday, sex, phone, and full name are encrypted together with AES-256-GCM at rest. Authentication and rate-limit tables contain no raw email codes or refresh credentials.

Access JWTs last 15 minutes. Sessions have a seven-day absolute expiry; refresh tokens rotate with consumed hashes retained until that expiry for replay detection. Cookie authentication uses HttpOnly, SameSite=Lax, host-only cookies, Secure in production, strict Origin checks, and signed double-submit CSRF plus session binding. Every protected request checks current verification, enabled state, session expiry/revocation, and server role. Client route guards supplement these backend checks.

Helmet, bounded JSON bodies, shared validation, safe errors/request IDs, parameterized ORM/SQL, IP limits, and persistent recipient counters are included. IP rate-limit state is per process: run **one API process** until a shared limiter store is introduced. Production requires HTTPS and validated PostgreSQL TLS. Configure trusted proxy hops for your actual deployment. The host serving React must also set document security headers; API Helmet headers alone do not protect that document. Keep encryption keys backed up privately; losing them loses access to encrypted profiles. Implement key rotation before a production rollout.

## Testing and maintenance

- `npm test`: validation, password hashing, encryption integrity, BMI, and permission field rejection.
- `npm run test:postgres`: Windows PostgreSQL API tests using a fresh, password-protected local fixture instance on a free loopback port. Defaults to PostgreSQL 18 at `C:\Program Files\PostgreSQL\18\bin`; set `PG_BIN` for another installation. This does not use or change the installed PostgreSQL service/database. Fixture data stays in ignored `.test-postgres/` and the fixture server stops afterward. The runner lock serializes fixture runs and recovers orphaned fixture instances.
- `npm run test:integration`: API tests against a **fresh local database whose name ends in `_test`**, configured only through `TEST_DATABASE_URL`. It refuses nonlocal/test URLs and does not clear an existing database.
- `node scripts/cleanupAuth.js`: remove old pending challenges, expired counters, and expired sessions. Arrange scheduling in your deployment; refresh history remains until absolute session expiry.
- `npm run admin`: trusted initial administrator setup in an interactive local terminal. No default admin/password exists; passwords are entered without echo. This operator-created account is outside public signup. Do not give server terminal access to untrusted users.

Dependency versions are pinned. The Sequelize `uuid` dependency is overridden to patched CommonJS-compatible `11.1.1`; migrations and transaction behavior are checked against PostgreSQL.
