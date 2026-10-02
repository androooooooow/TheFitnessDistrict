# The Fit District — Gym Management System

A PERN application for a single gym location. Members can manage their profile, track fitness progress, and scan the gym QR to record attendance. Admin manages memberships, views member progress and attendance, and reviews audit logs.

Payments are handled at the gym counter. Admin activates or renews access after confirming payment; the application does not process online payments.

## Features

| Area           | Included behavior                                                                                                                             |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Accounts       | Validated registration, email verification code, automatic sign-in after verification, password login, and logout                             |
| Roles          | `admin` and `user`, enforced by the backend                                                                                                   |
| Memberships    | Student/non-student rates; daily, 1-month, 3-month, 6-month, and annual access; counter-confirmed activation, renewal history, suspend/resume |
| Attendance     | Rotating admin QR, member camera/photo scanning, server-recorded time-in/time-out, and admin attendance history                               |
| Progress       | Weight, bench press, waist measurements, dated notes, charts, goals, and measurement editing                                                  |
| Profile        | Full name, birthday, sex, address, phone, weight, height, and calculated BMI                                                                  |
| Admin          | Dashboard, member search, member progress, attendance, reports, and audit logs                                                                |
| Public website | Responsive landing page, membership rates, FAQs, registration, and sign-in                                                                    |

The latest dated weight measurement updates profile weight and BMI. A change to profile weight creates a progress entry. Users access their own records; admin can view member records.

## Technology

- **PostgreSQL** for persistent data, with Sequelize and versioned migrations.
- **Express + Node.js** for the REST API.
- **React + Vite** for the frontend.
- **Tailwind CSS** for the responsive light theme with orange accents.
- **qrcode.react**, **ZXing**, and **jsQR** for QR display and scanning.
- **Nodemailer** for email verification, **Argon2id** for password hashing, and **Helmet** for API security headers.

## Project folders

```text
The FitnessDistrict/
├── README.md
├── Frontend/
│   ├── README.md
│   ├── public/branding/       Gym logo
│   ├── src/
│   │   ├── components/       Shared UI, forms, scanner, profile editor
│   │   ├── context/          Account and gym state
│   │   ├── lib/              API client, QR decoder, domain rules, exports
│   │   └── pages/            Landing, authentication, admin, and user screens
│   └── tests/
└── Backend/
    ├── README.md
    ├── migrations/           Versioned database changes
    ├── sql/                  SQL-only migration files for pgAdmin
    ├── scripts/              Setup, migrations, admin creation, test fixtures
    ├── src/
    │   ├── config/
    │   ├── routes/
    │   ├── controllers/
    │   ├── services/
    │   ├── models/
    │   ├── middleware/
    │   ├── validators/
    │   └── utils/
    └── tests/
```

See the [frontend guide](Frontend/README.md) and [backend guide](Backend/README.md) for detailed behavior, API endpoints, and configuration.

## Requirements

- Node.js **22.19 or newer**, with npm.
- A running PostgreSQL server and a database for this application. The isolated Windows test runner uses PostgreSQL 18 by default.
- SMTP email credentials for real email verification.
- Two terminal windows: one for the backend and one for the frontend.

Run npm commands inside the corresponding `Backend` or `Frontend` folder. There is no npm application at the project root.

## 1. Set up the backend

From the project root:

```powershell
cd Backend
npm ci
npm run setup:env
```

The setup script creates `Backend/.env` with separate random security keys. If `.env` already exists, it is preserved.

Edit that file locally and configure:

| Setting                                   | Purpose                                                            |
| ----------------------------------------- | ------------------------------------------------------------------ |
| `DATABASE_URL`                            | PostgreSQL connection string for your database and database login  |
| `FRONTEND_ORIGIN`                         | `http://127.0.0.1:5173` for the default local frontend             |
| `PORT`                                    | `3001` for the default API                                         |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`   | Email server connection and TLS settings supplied by your provider |
| `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` | Email credentials and sender address                               |
| `MAIL_TRANSPORT`                          | `smtp` for email delivery                                          |

Keep the generated keys private and retain them when restarting or updating the application. Existing encrypted profiles require the same encryption key. Do not commit `.env` or share credentials.

Create the configured database in PostgreSQL before applying migrations. Then, still inside `Backend`:

```powershell
npm run migrate
npm run dev
```

The API starts at **http://127.0.0.1:3001**. The health endpoint is **http://127.0.0.1:3001/api/v1/health**. Startup checks configuration, database migrations, and email connectivity.

For local development without SMTP, `MAIL_TRANSPORT=file` writes codes to the ignored `Backend/.mailbox/` folder. This mode sends no email and does not establish mailbox ownership. Production requires SMTP.

### Using pgAdmin for migrations

Alternatively, open **Query Tool** on the configured database and execute these complete files in order:

1. [001-auth.sql](Backend/sql/001-auth.sql)
2. [002-gym.sql](Backend/sql/002-gym.sql)
3. [003-progress.sql](Backend/sql/003-progress.sql)

Use the SQL files, not the JavaScript migration wrappers. These files record migration versions so later `npm run migrate` calls skip already-applied changes. Do not recreate or drop existing application tables to update the project.

## 2. Start the frontend

In a second terminal, from the project root:

```powershell
cd Frontend
npm ci
npm run dev
```

Open **http://127.0.0.1:5173**. Vite forwards `/api` requests to the backend at `127.0.0.1:3001`. Use `127.0.0.1` consistently with the configured frontend origin.

Real authentication is enabled by default. `VITE_ENABLE_PREVIEW=true` in `Frontend/.env.local` enables fictional sample dashboards for development only. Keep it disabled when using real accounts or deploying the application.

## 3. Create the administrator

After applying the migrations, open an interactive terminal inside `Backend`:

```powershell
npm run admin
```

Enter a new administrator email and password when prompted. Password entry is hidden. There is no default administrator account or shared password; public registration always creates a `user` account.

## How to use the system

1. **Register:** Enter full name, email, birthday, sex, address, phone, weight, height, preferred membership, student/non-student category, and password.
2. **Verify email:** Enter the emailed code. Successful verification creates the account and signs the member in.
3. **Activate access:** The member pays at the counter. Admin confirms payment and activates the selected membership.
4. **Record attendance:** Admin keeps **Attendance** open. The member opens **My attendance** and scans the displayed gym QR to time in or time out.
5. **Track progress:** The member records measurements and goals from **My progress**, and updates personal details from **My profile**. Admin can view the member's progress and attendance.

The gym QR refreshes every minute and expires after **90 seconds**. Use a fresh photo containing the whole QR and its white border. Logging out the issuing admin invalidates their QR. Photo decoding happens locally in the browser; only the attendance token is sent to the API.

Camera access requires HTTPS on phones, or localhost for development. Both development servers bind to `127.0.0.1`, so phones need a separately configured reachable HTTPS deployment.

## Checks and builds

| Folder     | Command                 | Purpose                                                        |
| ---------- | ----------------------- | -------------------------------------------------------------- |
| `Frontend` | `npm test`              | Domain rules, live-action routing, and QR image decoder tests  |
| `Frontend` | `npm run build`         | Generate the production frontend in `dist/`                    |
| `Frontend` | `npm run preview`       | Inspect the frontend build locally on port 4173                |
| `Backend`  | `npm test`              | Validation and security utility tests                          |
| `Backend`  | `npm run test:postgres` | API tests with an isolated local PostgreSQL fixture on Windows |
| Either     | `npm run format:check`  | Check formatting                                               |

Vite preview inherits the configured API proxy. To test account mutations there, keep the backend running, set its `FRONTEND_ORIGIN` to `http://127.0.0.1:4173`, and restart it. Restore the origin to port 5173 when returning to the development server. Vite preview is a local inspection tool, not the production hosting setup.

The PostgreSQL fixture runner uses a dedicated test database, not the configured application database. See the backend README for `PG_BIN` and other test options.

## Troubleshooting

- **Port 5173 is already in use:** The frontend may already be running. Open its URL, or stop the existing frontend terminal with `Ctrl+C` before restarting it.
- **API startup fails:** Check `.env`, PostgreSQL availability, applied migrations, and SMTP credentials. Restart the backend after changing `.env`.
- **SMTP connection or certificate error:** Check the provider's host, port, TLS settings, and trusted certificate chain. The backend scripts already use Node's system certificate store; certificate validation remains enabled.
- **npm certificate error on Windows:** If the issuer is trusted by Windows, run `$env:NODE_OPTIONS='--use-system-ca'` in that PowerShell session before retrying installation.
- **Old UI or placeholder message:** Refresh with `Ctrl+Shift+R`. Confirm the backend is running and sample preview is disabled.
- **QR rejected:** Refresh the admin QR, use a current complete image, and keep the issuing admin signed in. A new time-in also requires active membership access.

## Security and current scope

The backend validates request fields, enforces roles and ownership, hashes passwords, encrypts sensitive profile/progress data, uses parameterized database queries, and applies rate limits. Cookie sessions use HttpOnly cookies, CSRF protection, refresh rotation, and server-side revocation. Audit records accompany supported account, membership, progress, and attendance changes.

This version supports one gym location and one current membership per member. Google OAuth and persistent gym settings remain future work. Dashboard/report snapshots are limited to loaded records; attendance and progress journals provide server pagination. Production requires HTTPS, PostgreSQL TLS, appropriate frontend security headers, and deployment-specific proxy configuration. Run one API process until a shared IP rate-limit store is added.
