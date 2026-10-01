# The Fit District — Fitness Hub frontend

React + Vite + Tailwind CSS, with React Router, Lucide icons, and locally generated member QR cards. Light UI with orange accents, responsive admin/user layouts, sample members, and Manila-local dates.

The supplied Fit District logo is stored in `public/branding/fit-district-logo.png` and shared across the sidebar, account pages, and not-found page. The theme uses warm orange and charcoal to match the logo.

## Run

```text
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. The development server listens on the local computer only. Use `npm run build` for the production build, `npm run preview` to inspect it, and `npm test` for the preview domain tests.

## Included

- Admin overview: live counts derived from sample/local records, attendance chart, membership mix, recent visits, and activation/expiry attention list.
- Members: search, status filters, pagination, new member form, profile details, access history, suspend/resume.
- Memberships: monthly, ten-session, and one-admission day-pass plans; immediate activation/renewal after counter payment confirmation. Replaced access is retained in history. This first preview supports one current access per member; scheduled renewals and multiple concurrent grants are backend integration work.
- Attendance: member search/keyboard-scanner ID entry, time-in/time-out, open visits, date filters, local duplicate-check-in prevention, and session deduction on check-in only.
- Progress: weight, bench press, waist, metric charts, goals, dated notes, and editing rules for member-authored entries.
- Reports: period counts, unique visitors, completed-visit duration averages, unresolved visits, and CSV export.
- User dashboard: own membership, visits, progress, editable profile, and member QR card.
- Account screen previews: email/password login/signup, Google button, and verification screen with code `123456`, attempt counter, and resend cooldown.
- Settings: gym details and confirmation before restoring sample data.

## Preview boundary

This is a frontend preview using localStorage and sessionStorage. Use fictional data. The preview selector intentionally permits exploring both roles; it is not secure authentication or backend RBAC. Passwords are never saved, sign-in accepts preview inputs, verification does not send mail, and the Google button does not connect a Google account. Real verification, JWT/cookies, encryption, server-side transactions, rate limiting, and Helmet belong to the backend described in the project security plan.

Local mutations are separate pure functions in `src/lib/domain.js`, with shared state in `src/context/GymContext.jsx`. Replace their persistence/actions with `/api/v1` integrations when building the backend. Client checks improve the preview but cannot enforce real access, prevent concurrent server transactions, or secure stored data.

Daily membership expiry is exclusive at midnight Asia/Manila. A session pass is charged once per successful visit; returning after check-out consumes another visit. Check-out remains available after expiry. The preview currently tracks the selected active access; the backend will support selecting among multiple eligible access grants. Member card QR codes encode the displayed member ID, not an admission credential.

## Structure

```text
src/
  components/     shared UI, layout, forms, charts
  context/        local preview state/actions
  lib/            domain rules, sample data, CSV export
  pages/
    admin/        overview, members, attendance, memberships, reports, settings
    auth/         login, account creation, email verification preview
    user/         member dashboard, membership, profile
tests/            domain behavior tests
```

Before connecting live data, implement the backend security specification and replace preview role switching/sign-in with validated account/session state. Configure the production web host to route client-side URLs to `index.html`, and add the frontend document security headers.
