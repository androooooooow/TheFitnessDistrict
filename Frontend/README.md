# The Fit District — Fitness Hub frontend

React + Vite + Tailwind CSS, with React Router, Lucide icons, rotating gym QR display, and camera/photo QR scanning. Light UI with orange accents, responsive admin/user layouts, and Manila-local dates.

The supplied Fit District logo is stored in `public/branding/fit-district-logo.png` and shared across the landing page, sidebar, account pages, and not-found page. The theme uses warm orange and charcoal to match the logo.

## Run

```text
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. The development server listens on the local computer only. Use `npm run build` for the production build, `npm run preview` to inspect it, and `npm test` for domain rules, live-action routing, and QR decoder tests. Vite preview runs on port 4173 and inherits the API proxy. For account mutations in preview, change the backend's `FRONTEND_ORIGIN` to `http://127.0.0.1:4173` and restart it; restore port 5173 when returning to development. Production hosting needs its own frontend routing, API proxy, and security headers.

## Included

- Public landing page at `/`: responsive welcome page, signup steps, gym features, student/non-student rate switch, membership cards, daily rates, and FAQs. Choosing a membership preselects its plan/category on registration. Signed-in members can return to their dashboard from the page.
- Admin overview: counts derived from the loaded gym records, attendance chart, membership mix, recent visits, and activation/expiry attention list.
- Members: search, status filters, pagination, profile details, access history, suspend/resume. The new member form is sample-mode only; real members register with email verification.
- Memberships: the supplied poster’s student/non-student rates for 1, 3, 6, and 12 calendar months and single-admission daily passes. Daily entry is 7 AM–before noon or noon onwards; exactly noon uses the afternoon rate, with times in Asia/Manila. The 3/6/12-month plans include a free T-shirt. Activation stores the selected category, entry slot, and listed counter rate as access details; payment processing remains outside the app. Replaced access is retained in history. Existing preview ten-session packs remain readable and usable but cannot be newly activated. One current access per member is supported; scheduled renewals and multiple concurrent grants remain future work.
- Attendance: larger admin rotating gym QR, automatic visit refresh, paginated history and date filters. Users scan on My attendance using the camera or a current QR photo. Photo decoding uses jsQR with ZXing fallback, multiple image sizes, and overlapping crops for full-screen screenshots. Camera scanning requests the rear camera and higher resolution. Server transactions prevent duplicate visits and repeated daily-pass deductions. Admin has no manual attendance controls.
- Audit log: admin-only, filterable, paginated records for account, membership, and QR attendance activity.
- Progress: persistent weight, bench press, and waist journals, metric charts, goals, dated notes, and server-checked editing permissions. Admin can select a member and see both admin- and member-recorded entries. A Progress link in the membership table opens that member directly; users see their own entries. Journal history is paginated, charts show the latest 200 entries, and metric summaries use the full history.
- Reports: period counts, unique visitors, completed-visit duration averages, unresolved visits, and CSV export.
- User dashboard: own membership details, visits, progress screens, and editable profile. The profile saves all seven allowed fields, shows field validation errors and a BMI preview, preserves unsaved edits during background refreshes, and rejects stale saves. Latest weight entries update profile/BMI; saving a different profile weight adds a dated journal entry. Personal member QR cards have been removed.
- Connected account screens: required signup/profile fields, email-code verification before creating an account, automatic sign-in after verification, real password login/logout, and editable profile with BMI. Google OAuth is a future backend phase.
- Settings: gym details and confirmation before restoring sample data.

## Preview boundary

Real authentication is the default. Configure and start [the backend](../Backend/README.md) first, applying all three migrations; Vite proxies `/api` to `127.0.0.1:3001`. Authentication uses server-issued HttpOnly cookies, and real accounts cannot switch roles. Profiles, progress/goals, membership access/history, QR attendance, and audit logs persist in PostgreSQL. Preferred membership remains pending until admin confirms counter payment. Live members register with email verification; Add member is available only in sample mode. Settings still require their backend phase. Reports and overview summarize the loaded snapshot, limited to 1,000 members/recent visits; attendance and progress journals have complete server pagination.

For exploring the earlier sample gym dashboards, explicitly set `VITE_ENABLE_PREVIEW=true` in `.env.local` and restart Vite. This mode uses localStorage/sessionStorage and fictional sample data; the role selector is only a UI preview and grants no backend permissions. Real signup/login screens still require the backend. Keep preview mode off for production.

Sample mutations are separate pure functions in `src/lib/domain.js`, with shared state in `src/context/GymContext.jsx`. Live account, profile, progress, membership, and attendance flows use `/api/v1`; the backend enforces permissions and transaction rules. Progress, goals, and profile saves use the API even before client account state is hydrated, so authentication failures are shown instead of a disconnected-feature placeholder. Client checks supplement server validation.

Expiry dates are exclusive at midnight Asia/Manila. Monthly plans use calendar months, clamping to the final day for shorter months. A daily pass permits one admission in its selected entry window and can be timed out after that window or expiry. One current access is supported, with previous access preserved in history. Gym QR tokens expire after 90 seconds and refresh every minute; they become invalid when the issuing admin logs out. Camera scanning requires HTTPS on phones or localhost for development. Photos are decoded locally; only the signed attendance token is submitted to the backend.

## Structure

Member lists, membership access, attendance, progress journals, audit logs, and daily reports show **10 records per page**. Searches and filters return to the first page. Reports and charts still calculate totals across their full loaded dataset, and CSV exports include the selected reporting period rather than just the visible page.

```text
src/
  components/     shared UI, layout, forms, charts
  context/        authenticated account and optional sample gym state/actions
  lib/            API/CSRF client, domain rules, sample data, CSV export
  pages/
    admin/        overview, members, attendance, memberships, reports, settings
    auth/         login, account creation, email verification
    user/         member dashboard, membership, profile
tests/            domain, live-action routing, and QR image decoder tests
```

Account/profile, progress/goals, membership, QR attendance, and audit APIs are connected. Settings, Google OAuth, and deployment remain separate work. Configure the production web host to route client-side URLs to `index.html`, and add frontend document security headers. Keep the admin QR screen open and members signed in on their own devices.
