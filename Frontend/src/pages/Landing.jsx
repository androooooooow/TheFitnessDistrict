import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ScanLine,
  TrendingUp,
  Dumbbell,
  CalendarDays,
  ShieldCheck,
  Shirt,
  Sparkles,
} from 'lucide-react';
import { useGym } from '../context/GymContext';
import { currentPlans, dailyRates, peso } from '../lib/domain';

function TrainingArt() {
  return (
    <div className="relative mx-auto w-full max-w-[520px] px-3 pb-7 pt-4 sm:px-6">
      <div className="relative overflow-hidden rounded-[28px] bg-[#202b31] px-6 pb-8 pt-8 shadow-[0_24px_60px_-24px_#26303980]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[.2em] text-orange-200">
            Welcome to your district
          </span>
          <Dumbbell size={21} className="text-[#ffa32b]" />
        </div>
        <p className="mt-5 text-[38px] font-extrabold leading-[1.06] tracking-[-1.5px] text-white sm:text-[44px]">
          TRAIN.
          <br />
          TRACK.
          <br />
          <span className="text-[#ffa32b]">KEEP GOING.</span>
        </p>
        <svg viewBox="0 0 480 260" className="mt-2 w-full" aria-hidden="true">
          <defs>
            <linearGradient id="gymSun" x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="#ffb43d" />
              <stop offset="1" stopColor="#f58b0a" />
            </linearGradient>
            <linearGradient id="gymPlate" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#52626b" />
              <stop offset="1" stopColor="#26343d" />
            </linearGradient>
          </defs>
          <path
            d="M0 232H480M0 251H480M70 215L39 260M190 215L182 260M310 215L320 260M430 215L461 260"
            stroke="#435058"
            strokeWidth="1"
          />
          <circle cx="292" cy="101" r="89" fill="url(#gymSun)" />
          <path
            d="M215 158V94L246 84V158M256 158V52L291 38V158M300 158V74L331 89V158M340 158V116L367 126V158"
            fill="#202b31"
            stroke="#fff3d9"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <ellipse cx="246" cy="224" rx="166" ry="15" fill="#162027" opacity=".65" />
          <path
            d="M125 201V222M354 201V222"
            stroke="#9aabb4"
            strokeWidth="9"
            strokeLinecap="round"
          />
          <rect x="112" y="186" width="256" height="22" rx="8" fill="#f58b0a" />
          <path d="M122 192H353" stroke="#ffd58b" strokeWidth="3" strokeLinecap="round" />
          <path
            d="M84 175L98 107H143M383 175L369 107H324"
            fill="none"
            stroke="#90a1aa"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect x="55" y="124" width="377" height="11" rx="5" fill="#cbd6dc" />
          {[81, 107, 350, 376].map((x, i) => (
            <g key={x}>
              <rect
                x={x}
                y={i === 1 || i === 2 ? 86 : 99}
                width="24"
                height={i === 1 || i === 2 ? 89 : 65}
                rx="8"
                fill="url(#gymPlate)"
                stroke="#7d919d"
                strokeWidth="2"
              />
              <path
                d={`M${x + 7} ${i === 1 || i === 2 ? 98 : 109}V${i === 1 || i === 2 ? 162 : 152}`}
                stroke="#cbd6dc"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </g>
          ))}
          <path d="M33 128H51M436 128H450" stroke="#d9e3e8" strokeWidth="5" strokeLinecap="round" />
          <path d="M50 55L53 46L57 55L66 59L57 63L53 72L50 63L41 59Z" fill="#f7a331" />
        </svg>
        <div className="flex items-center gap-2 border-t border-white/10 pt-4 text-[11px] text-slate-300">
          <span className="h-2 w-2 rounded-full bg-[#ffa32b]" />
          Every visit is a step forward.
        </div>
      </div>
      <div className="absolute -right-1 top-16 hidden w-44 rotate-3 rounded-2xl border border-orange-100 bg-[#fffaf2] p-4 shadow-lg sm:block">
        <CalendarDays size={20} className="text-brand-strong" />
        <p className="mt-3 text-sm font-bold">
          A little consistency.
          <br />A big difference.
        </p>
        <div className="mt-3 flex gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <span
              key={n}
              className={`h-3 w-3 rounded-full ${n < 4 ? 'bg-[#f58b0a]' : 'bg-orange-100'}`}
            />
          ))}
        </div>
      </div>
      <div className="absolute bottom-0 left-0 flex items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-xl sm:left-2">
        <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
          <CheckCircle2 size={22} />
        </span>
        <div>
          <p className="text-xs font-bold">Your journey, in one place.</p>
          <p className="mt-1 text-[10px] text-muted">Attendance · Membership · Progress</p>
        </div>
      </div>
    </div>
  );
}
const benefits = [
  {
    icon: ScanLine,
    title: 'Walk in. Scan. Work out.',
    text: 'Scan the gym QR to time in and out. Your visits stay organized automatically.',
  },
  {
    icon: CalendarDays,
    title: 'Know where you stand.',
    text: 'See your membership, validity dates, and daily pass details whenever you need them.',
  },
  {
    icon: TrendingUp,
    title: 'Notice your small wins.',
    text: 'Track measurements, set a personal goal, and see how your training changes over time.',
  },
];
const faqs = [
  [
    'How do I become a member?',
    'Create an account and verify your email using the code we send. Then visit the gym counter to pay and have your chosen membership activated.',
  ],
  [
    'Can I pay through the website?',
    'Payments are handled at the gym counter. The admin confirms your payment and updates your membership in your account.',
  ],
  [
    'How does QR attendance work?',
    'Sign in, open My attendance, and scan the rotating QR displayed at the gym. Scan when you arrive to time in, then scan again before you leave to time out.',
  ],
  [
    'What can I track in my progress?',
    'Record weight, bench press, and waist measurements with dates and notes. Set a goal for each metric. You and the gym admin can view your progress; you can edit entries you recorded yourself.',
  ],
  [
    'What do I need for the student rate?',
    'Choose the student category when you register and confirm your eligibility with the gym counter. The admin confirms the category when activating your access.',
  ],
];
export default function Landing() {
  const { authUser } = useGym();
  const [category, setCategory] = useState('student');
  const destination = authUser ? (authUser.role === 'admin' ? '/admin' : '/user') : '/register';
  const cta = authUser ? 'Go to my dashboard' : 'Start your journey';
  return (
    <div className="bg-white">
      <header className="border-b border-orange-100/80 bg-white">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-2 px-5 py-2 sm:px-8">
          <Link to="/" aria-label="The Fit District home">
            <img
              src="/branding/fit-district-logo.png"
              alt="The Fit District — Fitness Hub"
              className="h-[72px] w-[108px] object-cover object-[center_40%] sm:w-[138px]"
            />
          </Link>
          <nav
            aria-label="Landing navigation"
            className="hidden items-center gap-8 text-xs font-medium text-muted md:flex"
          >
            <a href="#why-us" className="hover:text-brand-strong">
              Your district
            </a>
            <a href="#memberships" className="hover:text-brand-strong">
              Memberships
            </a>
            <a href="#questions" className="hover:text-brand-strong">
              FAQs
            </a>
          </nav>
          <div className="flex items-center gap-3 sm:gap-5">
            {!authUser && (
              <Link
                to="/login"
                className="whitespace-nowrap text-xs font-semibold hover:text-brand-strong"
              >
                Sign in
              </Link>
            )}
            <Link to={destination} className="btn btn-primary whitespace-nowrap">
              {authUser ? 'My dashboard' : 'Join now'}
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </header>
      <main id="main-content">
        <section className="relative overflow-hidden bg-[linear-gradient(125deg,#fff_25%,#fff8ed_100%)]">
          <div className="mx-auto grid max-w-[1200px] items-center gap-9 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[1.08fr_1fr] lg:gap-8 lg:py-20">
            <div>
              <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-3 py-2 text-[10px] font-semibold tracking-wide text-brand-strong">
                <Sparkles size={13} />
                Your neighborhood. Your next chapter.
              </p>
              <h1 className="max-w-xl text-[46px] font-extrabold leading-[1.06] tracking-[-2px] text-[#263039] sm:text-[62px] lg:text-[66px]">
                A stronger you.
                <br />
                <span className="text-[#b65b0a]">
                  One visit at
                  <br className="hidden sm:block" /> a time.
                </span>
              </h1>
              <p className="mt-6 max-w-md text-sm leading-7 text-muted sm:text-[15px]">
                Welcome to The Fit District. A space to show up for yourself, build a routine, and
                keep your progress close. We’ll take care of the little details.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to={destination}
                  className="inline-flex min-h-12 items-center gap-3 rounded-xl bg-[#b65b0a] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#995008]"
                >
                  {cta}
                  <ArrowRight size={17} />
                </Link>
                <a
                  href="#memberships"
                  className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-line bg-white px-5 text-sm font-semibold hover:bg-orange-50"
                >
                  Explore memberships
                </a>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-muted">
                <span className="flex items-center gap-1.5">
                  <Check size={14} className="text-brand-strong" />
                  Student-friendly rates
                </span>
                <span className="flex items-center gap-1.5">
                  <Check size={14} className="text-brand-strong" />
                  Pay at the counter
                </span>
              </div>
            </div>
            <TrainingArt />
          </div>
        </section>
        <section id="why-us" className="scroll-mt-6 border-y border-line">
          <div className="mx-auto grid max-w-[1200px] gap-8 px-5 py-10 sm:px-8 md:grid-cols-3">
            {benefits.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex items-start gap-4">
                <span className="rounded-xl bg-orange-50 p-3 text-brand-strong">
                  <Icon size={23} />
                </span>
                <div>
                  <h2 className="text-sm font-bold">{title}</h2>
                  <p className="mt-2 text-xs leading-6 text-muted">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8 sm:py-20">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-brand-strong">
                Getting started
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-[-1px] sm:text-4xl">
                Your first step is simple.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-muted">
              A few details today. A routine you can grow into tomorrow.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              [
                '01',
                ShieldCheck,
                'Make it yours.',
                'Create your account, verify your email, and fill in your profile.',
              ],
              [
                '02',
                Dumbbell,
                'Find your rhythm.',
                'Choose a daily pass or membership. Pay at the counter to activate your access.',
              ],
              [
                '03',
                TrendingUp,
                'Keep showing up.',
                'Scan the gym QR, record your measurements, and follow your progress.',
              ],
            ].map(([n, Icon, title, text]) => (
              <div key={n} className="rounded-2xl border border-line bg-[#fafaf8] p-7">
                <div className="mb-7 flex items-center justify-between">
                  <span className="text-[34px] font-bold tracking-tight text-orange-200">{n}</span>
                  <Icon size={24} className="text-brand-strong" />
                </div>
                <h3 className="text-lg font-bold">{title}</h3>
                <p className="mt-3 text-xs leading-6 text-muted">{text}</p>
              </div>
            ))}
          </div>
        </section>
        <section id="memberships" className="scroll-mt-6 border-y border-orange-100 bg-[#fff9f1]">
          <div className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8 sm:py-20">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.18em] text-brand-strong">
                  A plan for your pace
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-[-1px] sm:text-4xl">
                  Make room for your routine.
                </h2>
                <p className="mt-4 text-sm text-muted">
                  Straightforward rates. Payments handled at the gym counter.
                </p>
              </div>
              <div
                className="flex rounded-xl border border-orange-200 bg-white p-1"
                aria-label="Membership rate category"
              >
                {[
                  ['student', 'Student'],
                  ['nonStudent', 'Non-student'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    aria-pressed={category === key}
                    onClick={() => setCategory(key)}
                    className={`rounded-lg px-4 py-2.5 text-xs font-semibold transition-colors ${category === key ? 'bg-[#263039] text-white' : 'text-muted hover:bg-orange-50'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {currentPlans
                .filter((p) => p.type === 'membership')
                .map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-col rounded-2xl border border-orange-100 bg-white p-6"
                  >
                    <p className="text-xs font-semibold text-muted">
                      {p.months === 1 ? '1 month' : `${p.months} months`}
                    </p>
                    <p className="mt-5 text-[30px] font-bold tracking-[-1px]">
                      {peso(p.rates[category])}
                    </p>
                    <p className="mt-1 text-[10px] text-muted">
                      {category === 'student' ? 'Student' : 'Non-student'} membership
                    </p>
                    <div className="my-6 space-y-3 text-xs">
                      <p className="flex items-center gap-2">
                        <Check size={14} className="text-brand-strong" />
                        Unlimited gym visits
                      </p>
                      <p className="flex items-center gap-2">
                        <Check size={14} className="text-brand-strong" />
                        Attendance & progress tracking
                      </p>
                      {p.months > 1 ? (
                        <p className="flex items-center gap-2">
                          <Shirt size={14} className="text-brand-strong" />
                          Free T-shirt included
                        </p>
                      ) : (
                        <p className="flex items-center gap-2">
                          <CalendarDays size={14} className="text-brand-strong" />
                          One calendar month
                        </p>
                      )}
                    </div>
                    <Link
                      to={
                        authUser
                          ? destination
                          : `/register?${new URLSearchParams({ membership: p.id, category })}`
                      }
                      className="mt-auto flex items-center justify-between rounded-lg border border-line px-3 py-3 text-xs font-semibold hover:border-orange-200 hover:bg-orange-50"
                    >
                      {authUser ? 'View my account' : 'Choose your membership'}
                      <ArrowUpRight size={14} />
                    </Link>
                  </div>
                ))}
            </div>
            <div className="mt-5 grid gap-5 rounded-2xl bg-[#263039] p-6 text-white sm:p-8 md:grid-cols-[1fr_1.25fr]">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-orange-200">
                  Daily / per session
                </p>
                <h3 className="mt-3 text-xl font-bold">Just dropping in?</h3>
                <p className="mt-2 text-xs leading-6 text-slate-300">
                  One admission on your selected day.
                  <br />A good place to start, at your own pace.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-5 self-center">
                {dailyRates.map((r) => (
                  <div key={r.id} className="border-l border-white/15 pl-5">
                    <p className="text-[10px] leading-5 text-slate-300">
                      {r.id === 'morning' ? '7 AM – before 12 noon' : '12 noon onwards'}
                    </p>
                    <p className="mt-2 text-3xl font-bold text-[#ffb54c]">{peso(r[category])}</p>
                    <p className="mt-2 text-[10px] text-slate-300">
                      {category === 'student' ? 'Student' : 'Non-student'} · per session
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
        <section
          id="questions"
          className="mx-auto grid max-w-[1200px] scroll-mt-6 gap-8 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[.8fr_1.2fr]"
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-brand-strong">
              Good to know
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-1px] sm:text-4xl">
              A little clarity.
              <br />A confident start.
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-7 text-muted">
              New to the district? Here’s what to expect before your first visit.
            </p>
          </div>
          <div className="space-y-3">
            {faqs.map(([q, a]) => (
              <details key={q} className="group rounded-xl border border-line bg-white">
                <summary className="cursor-pointer px-5 py-5 text-sm font-semibold marker:text-brand-strong">
                  {q}
                </summary>
                <p className="px-5 pb-5 text-xs leading-7 text-muted">{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="mx-auto max-w-[1200px] px-5 pb-16 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-6 rounded-[24px] bg-[#fff0da] p-8 sm:p-11">
            <div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-brand-strong">
                You belong here
              </p>
              <h2 className="text-3xl font-bold tracking-[-1px]">
                Start where you are.
                <br />
                Build from there.
              </h2>
              <p className="mt-4 text-sm text-muted">Your next chapter is one visit away.</p>
            </div>
            <Link
              to={destination}
              className="inline-flex min-h-12 items-center gap-4 rounded-xl bg-[#263039] px-6 text-sm font-semibold text-white hover:bg-[#3a474f]"
            >
              {cta}
              <ArrowRight size={17} />
            </Link>
          </div>
        </section>
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-5 px-5 py-7 text-xs text-muted sm:px-8">
          <div>
            <p className="font-bold text-ink">
              The Fit District <span className="font-normal">· Fitness Hub</span>
            </p>
            <p className="mt-2 text-[10px]">Show up for yourself. We’re here for the journey.</p>
          </div>
          <div className="flex flex-wrap gap-5">
            <a href="#memberships" className="hover:text-brand-strong">
              Memberships
            </a>
            <a href="#questions" className="hover:text-brand-strong">
              FAQs
            </a>
            <Link to={authUser ? destination : '/login'} className="hover:text-brand-strong">
              {authUser ? 'My dashboard' : 'Member sign in'}
            </Link>
            <span>© {new Date().getFullYear()} The Fit District</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
