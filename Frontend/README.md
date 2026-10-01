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
- Memberships: the supplied poster’s student/non-student rates for 1, 3, 6, and 12 calendar months and single-admission daily passes. Daily entry is 7 AM–before noon or noon onwards; exactly noon uses the afternoon rate, with times in Asia/Manila. The 3/6/12-month plans include a free T-shirt. Activation stores the selected category, entry slot, and listed counter rate as access details; payment processing remains outside the app. Replaced access is retained in history. Existing preview ten-session packs remain readable and usable but cannot be newly activated. This first preview supports one current access per member; scheduled renewals and multiple concurrent grants are backend integration work.
- Attendance: member search/keyboard-scanner ID entry, time-in/time-out, open visits, date filters, local duplicate-check-in prevention, and session deduction on check-in only.
- Progress: weight, bench press, waist, metric charts, goals, dated notes, and editing rules for member-authored entries. Admin can select any member and see both admin- and member-recorded entries. A Progress link in the membership table opens that member directly; users see their own entries.
- Reports: period counts, unique visitors, completed-visit duration averages, unresolved visits, and CSV export.
- User dashboard: own membership, visits, progress, editable profile, and member QR card.
- Connected account screens: required signup/profile fields, email-code verification before creating an account, automatic sign-in after verification, real password login/logout, and editable profile with BMI. Google OAuth is a future backend phase.
- Settings: gym details and confirmation before restoring sample data.

## Preview boundary

Real authentication is the default. Configure and start [the backend](../Backend/README.md) first; Vite proxies `/api` to `127.0.0.1:3001`. Authentication uses server-issued HttpOnly cookies, and real accounts cannot switch roles. Profile data persists in PostgreSQL. Preferred membership is saved but remains pending counter payment and admin activation. Gym attendance, membership activation, progress, reports, and settings APIs are upcoming; their mutations are disabled for real accounts.

For exploring the earlier sample gym dashboards, explicitly set `VITE_ENABLE_PREVIEW=true` in `.env.local` and restart Vite. This mode uses localStorage/sessionStorage and fictional sample data; the role selector is only a UI preview and grants no backend permissions. Real signup/login screens still require the backend. Keep preview mode off for production.

Local mutations are separate pure functions in `src/lib/domain.js`, with shared state in `src/context/GymContext.jsx`. Replace their persistence/actions with `/api/v1` integrations when building the backend. Client checks improve the preview but cannot enforce real access, prevent concurrent server transactions, or secure stored data.

Expiry dates are exclusive at midnight Asia/Manila. New monthly plans use calendar months, clamping to the final day for shorter months. A daily pass permits one admission in its selected entry window and can be checked out after that window or expiry. A previous preview session pack deducts one session per successful visit; returning after check-out consumes another visit. Existing saved access dates/balances and records are preserved; new rate details are recorded on activation/renewal. The preview currently tracks the selected active access; the backend will support selecting among multiple eligible access grants. Member card QR codes encode the displayed member ID, not an admission credential.

## Structure

```text
src/
  components/     shared UI, layout, forms, charts
  context/        authenticated account and optional sample gym state/actions
  lib/            API/CSRF client, domain rules, sample data, CSV export
  pages/
    admin/        overview, members, attendance, memberships, reports, settings
    auth/         login, account creation, email verification
    user/         member dashboard, membership, profile
tests/            domain behavior tests
```

Account session state and own-profile persistence are connected. Integrate the remaining gym actions with server authorization and transactions before using them for real gym operations. Configure the production web host to route client-side URLs to `index.html`, and add the frontend document security headers.
