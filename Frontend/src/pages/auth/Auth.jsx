import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Mail,
  Check,
  Dumbbell,
} from 'lucide-react';
import { Brand, Button, Field, Toast } from '../../components/UI';
import { useGym } from '../../context/GymContext';

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3A12 12 0 1 1 32.2 14l5.7-5.7A20 20 0 1 0 44 24c0-1.2-.1-2.4-.4-3.5Z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8A12 12 0 0 1 32.2 14l5.7-5.7A20 20 0 0 0 6.3 14.7Z"
      />
      <path
        fill="#4CAF50"
        d="M24 44a20 20 0 0 0 13.4-5.2l-6.2-5.3A12 12 0 0 1 12.7 28l-6.6 5.1A20 20 0 0 0 24 44Z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.5l6.2 5.3A20 20 0 0 0 44 24c0-1.2-.1-2.4-.4-3.5Z"
      />
    </svg>
  );
}
export default function Auth() {
  const { state, setUserId, notify, createMember } = useGym();
  const navigate = useNavigate();
  const location = useLocation();
  const register = location.pathname === '/register';
  const verify = location.pathname === '/verify-email';
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('user');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const [pending] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('fd-preview-signup'));
    } catch {
      return null;
    }
  });
  useEffect(() => {
    setError('');
    setCode('');
  }, [location.pathname]);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  function login(chosen = role, email = form.email) {
    const member =
      state.members.find((m) => m.email.toLowerCase() === email.toLowerCase()) ||
      state.members.find((m) => m.id === 'm1') ||
      state.members[0];
    if (member) setUserId(member.id);
    navigate(chosen === 'admin' ? '/admin' : '/user');
    notify(`${chosen === 'admin' ? 'Admin' : 'Member'} preview opened.`);
  }
  function signup(input) {
    sessionStorage.setItem(
      'fd-preview-signup',
      JSON.stringify({ name: input.name, email: input.email }),
    );
    setForm({ ...form, password: '' });
    navigate('/verify-email');
  }
  function submit(e) {
    e.preventDefault();
    setError('');
    if (register) {
      if (form.password.length < 8) {
        setError('Use at least 8 characters for this preview.');
        return;
      }
      signup(form);
    } else login();
  }
  function verifyCode(e) {
    e.preventDefault();
    if (attempts >= 5) {
      setError('Preview attempt limit reached. Return to create account to restart.');
      return;
    }
    if (code !== '123456') {
      setAttempts(attempts + 1);
      setError(`That code doesn’t match. ${Math.max(0, 4 - attempts)} attempts remaining.`);
      return;
    }
    if (!pending) {
      setError('Start by creating a preview account.');
      return;
    }
    let member = state.members.find((m) => m.email.toLowerCase() === pending.email.toLowerCase());
    if (!member) {
      const result = createMember(pending);
      if (!result) return;
      member = result.member;
    }
    setUserId(member.id);
    sessionStorage.removeItem('fd-preview-signup');
    navigate('/user');
    notify('Email verification preview complete. Visit the counter to activate gym access.');
  }
  return (
    <div className="grid min-h-screen lg:grid-cols-[.95fr_1.05fr]">
      <aside className="auth-art relative hidden min-h-screen flex-col justify-between overflow-hidden bg-[#1d2529] p-12 text-white lg:flex">
        <Brand inverse />
        <div className="relative z-10 mb-12">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-[10px] uppercase tracking-[.15em] text-orange-200">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-300" />
            Welcome to your district
          </span>
          <h1 className="mt-7 text-[55px] font-bold leading-[1.09] tracking-[-2.5px]">
            Good people.
            <br />
            Big goals.
            <br />
            <span className="text-[#ffc777]">Better together.</span>
          </h1>
          <p className="mt-6 max-w-[325px] text-sm leading-7 text-white/50">
            A home for your fitness journey.
            <br />
            Show up, find your rhythm, and build something stronger.
          </p>
          <div className="mt-10 flex items-center gap-3">
            <div className="flex -space-x-2">
              {['SR', 'DC', 'IS', 'AM'].map((name, i) => (
                <span
                  key={name}
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#1d2529] text-[9px] font-semibold"
                  style={{
                    background: ['#e9b79d', '#a9c3c1', '#c1b3d4', '#d6c08b'][i],
                    color: '#3b4245',
                  }}
                >
                  {name}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-white/60">Your community is waiting.</p>
          </div>
        </div>
        <p className="relative z-10 text-[10px] text-white/35">
          © {new Date().getFullYear()} The Fit District · One step at a time.
        </p>
        <div className="auth-orbit absolute -bottom-56 -right-64 h-[620px] w-[620px] rounded-full border-[80px] border-[#f58b0a]/10" />
        <Dumbbell
          size={300}
          strokeWidth={0.5}
          className="absolute -right-20 top-20 -rotate-45 text-white/[.035]"
        />
      </aside>
      <main
        id="main-content"
        className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-10 sm:px-14"
      >
        <div className="mb-8 lg:hidden">
          <Brand />
        </div>
        <div className="w-full max-w-[380px]">
          <Link
            to="/admin"
            className="mb-8 inline-flex items-center gap-1.5 text-[11px] text-muted hover:text-brand-strong"
          >
            <ArrowLeft size={13} />
            Back to dashboard preview
          </Link>
          <div className="mb-6 rounded-lg border border-orange-100 bg-orange-50/70 px-3 py-2.5 text-[10px] leading-5 text-[#a76b48]">
            Interactive preview · No emails sent or real accounts created.
          </div>
          {verify ? (
            <>
              <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-brand-strong">
                <Mail size={24} />
              </span>
              <h2 className="text-[29px] font-bold tracking-[-1px]">Check your inbox</h2>
              <p className="mb-6 mt-3 text-xs leading-6 text-muted">
                {pending ? (
                  <>
                    Enter the six-digit verification code for{' '}
                    <strong className="text-ink">{pending.email}</strong>.
                  </>
                ) : (
                  'Create a preview account first to try email verification.'
                )}
              </p>
              {pending ? (
                <form onSubmit={verifyCode} className="space-y-5">
                  <Field
                    label="Verification code"
                    hint="For this preview, use 123456. No message was sent."
                  >
                    <input
                      className="input h-14 text-center font-mono text-2xl tracking-[.5em]"
                      aria-label="Verification code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]{6}"
                      minLength={6}
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      required
                      placeholder="000000"
                    />
                  </Field>
                  {error && (
                    <p role="alert" className="text-xs leading-5 text-rose-600">
                      {error}
                    </p>
                  )}
                  <Button className="w-full" type="submit" disabled={attempts >= 5}>
                    Verify email <ArrowRight size={16} />
                  </Button>
                  <p className="text-center text-[11px] text-muted">
                    Need another code?{' '}
                    <button
                      type="button"
                      className="font-semibold text-brand-strong disabled:text-slate-400"
                      disabled={cooldown > 0 || attempts >= 5}
                      onClick={() => {
                        setCooldown(60);
                        notify('Resend preview: use 123456. No email was sent.');
                      }}
                    >
                      {cooldown ? `Try again in ${cooldown}s` : 'Resend code'}
                    </button>
                  </p>
                </form>
              ) : (
                <Button onClick={() => navigate('/register')}>
                  Create an account <ArrowRight size={15} />
                </Button>
              )}
              <Link
                to="/register"
                className="mt-6 block text-center text-[11px] font-semibold text-muted"
              >
                Use a different email
              </Link>
            </>
          ) : (
            <>
              <h2 className="text-[29px] font-bold tracking-[-1px]">
                {register ? 'Your journey starts here' : 'Good to have you back'}
              </h2>
              <p className="mb-7 mt-3 text-xs leading-6 text-muted">
                {register
                  ? 'A little commitment. A community behind you.'
                  : 'Step into your district and pick up where you left off.'}
              </p>
              <Button
                variant="secondary"
                className="h-11 w-full"
                onClick={() => {
                  if (register) signup({ name: 'Jordan Lee', email: 'jordan.preview@example.com' });
                  else {
                    login('user', 'alex.morgan@example.com');
                    notify('Google sign-in preview opened. No Google account was connected.');
                  }
                }}
              >
                <GoogleIcon />
                Continue with Google
              </Button>
              <div className="my-6 flex items-center gap-4">
                <span className="h-px flex-1 bg-line" />
                <span className="text-[10px] text-muted">or continue with email</span>
                <span className="h-px flex-1 bg-line" />
              </div>
              <form onSubmit={submit} className="space-y-4">
                {register && (
                  <Field label="Full name">
                    <input
                      className="input h-11"
                      name="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Your full name"
                      required
                      minLength={2}
                      maxLength={100}
                    />
                  </Field>
                )}
                <Field label="Email address">
                  <input
                    className="input h-11"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder={register ? 'you@example.com' : 'alex.morgan@example.com'}
                    required
                    maxLength={150}
                  />
                </Field>
                <Field
                  label="Password"
                  hint={
                    register
                      ? 'At least 8 characters. Preview passwords are not stored.'
                      : undefined
                  }
                >
                  <div className="relative">
                    <input
                      className="input h-11 pr-11"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder={register ? 'Create a password' : 'Enter your password'}
                      autoComplete={register ? 'new-password' : 'current-password'}
                      required
                      minLength={register ? 8 : 1}
                    />
                    <button
                      className="absolute right-3 top-3 text-muted"
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </Field>
                {!register && (
                  <Field label="Explore as">
                    <div className="flex rounded-lg bg-canvas p-1">
                      {['user', 'admin'].map((r) => (
                        <button
                          key={r}
                          type="button"
                          className={`tab flex-1 ${role === r ? 'tab-active' : ''}`}
                          onClick={() => setRole(r)}
                        >
                          {r === 'user' ? 'User preview' : 'Admin preview'}
                        </button>
                      ))}
                    </div>
                  </Field>
                )}
                {error && (
                  <p role="alert" className="text-xs text-rose-600">
                    {error}
                  </p>
                )}
                <Button className="mt-2 h-11 w-full" type="submit">
                  {register ? 'Create account' : 'Sign in to preview'}
                  <ArrowRight size={16} />
                </Button>
              </form>
              <p className="mt-6 text-center text-[11px] text-muted">
                {register ? 'Already part of the district?' : 'New to the district?'}{' '}
                <Link
                  className="font-semibold text-brand-strong"
                  to={register ? '/login' : '/register'}
                >
                  {register ? 'Sign in' : 'Create an account'}
                </Link>
              </p>
              <p className="mt-8 flex items-center justify-center gap-1.5 text-[10px] text-muted">
                <ShieldCheck size={13} />
                Your membership is activated by the admin at the gym.
              </p>
            </>
          )}
        </div>
      </main>
      <Toast />
    </div>
  );
}
