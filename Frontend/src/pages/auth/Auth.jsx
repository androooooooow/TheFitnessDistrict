import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Mail, ShieldCheck, Dumbbell } from 'lucide-react';
import { Brand, Button, Field, Toast } from '../../components/UI';
import { useGym } from '../../context/GymContext';
import { localDate } from '../../lib/domain';

const pendingKey = 'fd-email-challenge';
const initial = {
  fullName: '',
  email: '',
  birthday: '',
  sex: '',
  address: '',
  phone: '',
  weight: '',
  height: '',
  membership: 'monthly',
  rateCategory: '',
  password: '',
};
export default function Auth() {
  const {
    authUser,
    loginAccount,
    signupAccount,
    verifyAccount,
    resendCode,
    notify,
    previewEnabled,
  } = useGym();
  const navigate = useNavigate();
  const location = useLocation();
  const register = location.pathname === '/register';
  const verify = location.pathname === '/verify-email';
  const [form, setForm] = useState(() => {
    const preferences = new URLSearchParams(location.search);
    const membership = preferences.get('membership');
    const rateCategory = preferences.get('category');
    return {
      ...initial,
      membership: ['monthly', 'quarterly', 'half-year', 'annual', 'day'].includes(membership)
        ? membership
        : initial.membership,
      rateCategory: ['student', 'nonStudent'].includes(rateCategory) ? rateCategory : '',
    };
  });
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(pendingKey));
    } catch {
      return null;
    }
  });
  const [cooldown, setCooldown] = useState(() =>
    Math.max(0, Math.ceil(((pending?.resendAt || 0) - Date.now()) / 1000)),
  );
  useEffect(() => {
    if (authUser) navigate(authUser.role === 'admin' ? '/admin' : '/user', { replace: true });
  }, [authUser, navigate]);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  function savePending(challengeId, email, resendAfter = 60) {
    const value = { challengeId, email, resendAt: Date.now() + resendAfter * 1000 };
    sessionStorage.setItem(pendingKey, JSON.stringify(value));
    setPending(value);
    setCooldown(resendAfter);
  }
  const change = (e) => {
    const { name, value } = e.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFields((current) => ({ ...current, [name]: undefined }));
  };
  async function submit(e) {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget));
    setError('');
    setFields({});
    setBusy(true);
    try {
      if (register) {
        const result = await signupAccount({
          ...values,
          weight: Number(values.weight),
          height: Number(values.height),
        });
        savePending(result.challengeId, values.email.trim(), result.resendAfter);
        setForm({ ...values, password: '' });
        navigate('/verify-email');
      } else {
        const user = await loginAccount({ email: values.email, password: values.password });
        navigate(user.role === 'admin' ? '/admin' : '/user', { replace: true });
      }
    } catch (err) {
      setError(err.message);
      setFields(err.fields || {});
      if (register && err.challengeId) {
        savePending(err.challengeId, form.email.trim(), err.retryAfter || 60);
        navigate('/verify-email', { state: { mailError: err.message } });
      }
    } finally {
      setBusy(false);
    }
  }
  async function verifyCode(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await verifyAccount({ challengeId: pending.challengeId, code });
      sessionStorage.removeItem(pendingKey);
      navigate(user.role === 'admin' ? '/admin' : '/user', { replace: true });
      notify('Email verified. Welcome to The Fit District!');
    } catch (err) {
      setError(err.message);
      if (err.retryAfter) setCooldown(err.retryAfter);
    } finally {
      setBusy(false);
    }
  }
  async function resend() {
    setError('');
    setBusy(true);
    try {
      const result = await resendCode(pending.challengeId);
      savePending(result.challengeId, pending.email, result.resendAfter);
      notify('Another verification code was sent.');
    } catch (err) {
      setError(err.message);
      if (err.retryAfter) setCooldown(err.retryAfter);
    } finally {
      setBusy(false);
    }
  }
  function input(name, label, props = {}) {
    return (
      <Field label={label}>
        <input
          className="input h-11"
          aria-label={label}
          aria-invalid={!!fields[name]}
          aria-describedby={fields[name] ? `${name}-error` : undefined}
          name={name}
          value={form[name]}
          onChange={change}
          onInput={props.type === 'date' ? change : undefined}
          required
          disabled={busy}
          {...props}
        />
        {fields[name] && (
          <p id={`${name}-error`} className="mt-1 text-xs text-rose-600">
            {fields[name]}
          </p>
        )}
      </Field>
    );
  }
  function select(name, label, options) {
    return (
      <Field label={label}>
        <select
          className="input h-11"
          aria-label={label}
          name={name}
          value={form[name]}
          onChange={change}
          required
          disabled={busy}
          aria-invalid={!!fields[name]}
        >
          {options.map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </select>
        {fields[name] && <p className="mt-1 text-xs text-rose-600">{fields[name]}</p>}
      </Field>
    );
  }
  const calculatedBmi =
    Number(form.weight) > 0 && Number(form.height) > 0
      ? (Number(form.weight) / (Number(form.height) / 100) ** 2).toFixed(1)
      : null;
  return (
    <div className="grid min-h-screen lg:grid-cols-[.85fr_1.15fr]">
      <aside className="auth-art relative hidden min-h-screen flex-col justify-between overflow-hidden bg-[#1d2529] p-12 text-white lg:flex">
        <Link to="/" aria-label="Back to home">
          <Brand inverse />
        </Link>
        <div className="relative z-10 my-16">
          <span className="text-xs font-semibold uppercase tracking-[.15em] text-orange-200">
            Welcome to your district
          </span>
          <h1 className="mt-7 text-[52px] font-bold leading-[1.1] tracking-[-2px]">
            A stronger you.
            <br />A community
            <br />
            behind you.
          </h1>
          <p className="mt-6 max-w-sm text-sm leading-7 text-white/60">
            Track your visits, stay consistent, and notice your progress. Your next step starts
            here.
          </p>
        </div>
        <p className="text-xs text-white/50">The Fit District · Fitness Hub</p>
        <Dumbbell
          size={300}
          strokeWidth={0.5}
          className="absolute -right-20 top-32 -rotate-45 text-white/[.04]"
        />
      </aside>
      <main
        id="main-content"
        className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-10 sm:px-12"
      >
        <div className="mb-8 lg:hidden">
          <Link to="/" aria-label="Back to home">
            <Brand />
          </Link>
        </div>
        <div className={`w-full ${register ? 'max-w-[560px]' : 'max-w-[400px]'}`}>
          {previewEnabled && (
            <Link to="/admin" className="mb-6 block text-xs text-brand-strong">
              Open sample dashboard
            </Link>
          )}
          {verify ? (
            <>
              <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-brand-strong">
                <Mail size={24} />
              </span>
              <h2 className="text-[29px] font-bold tracking-[-1px]">Verify your email</h2>
              <p className="mb-6 mt-3 text-sm leading-6 text-muted">
                {pending ? (
                  <>
                    Enter the six-digit code sent to{' '}
                    <strong className="text-ink break-all">{pending.email}</strong>. Your account is
                    created only after verification.
                  </>
                ) : (
                  'Start your signup to receive an email verification code.'
                )}
              </p>
              {location.state?.mailError && (
                <p role="alert" className="mb-4 text-xs text-rose-600">
                  {location.state.mailError}
                </p>
              )}
              {pending ? (
                <form onSubmit={verifyCode} className="space-y-5">
                  <Field label="Verification code" hint="The code expires in 10 minutes.">
                    <input
                      className="input h-14 text-center font-mono text-2xl tracking-[.4em]"
                      aria-label="Verification code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]{6}"
                      minLength={6}
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      required
                      disabled={busy}
                      placeholder="000000"
                    />
                  </Field>
                  {error && (
                    <p role="alert" className="text-xs text-rose-600">
                      {error}
                    </p>
                  )}
                  <Button className="w-full" type="submit" disabled={busy}>
                    {busy ? 'Verifying…' : 'Verify & sign in'}
                    <ArrowRight size={16} />
                  </Button>
                  <p className="text-center text-xs text-muted">
                    Didn’t receive the code?{' '}
                    <button
                      type="button"
                      onClick={resend}
                      disabled={busy || cooldown > 0}
                      className="font-semibold text-brand-strong disabled:text-slate-400"
                    >
                      {cooldown ? `Resend in ${cooldown}s` : 'Resend code'}
                    </button>
                  </p>
                </form>
              ) : (
                <Button onClick={() => navigate('/register')}>
                  Create an account
                  <ArrowRight size={15} />
                </Button>
              )}
              <Link to="/register" className="mt-6 block text-center text-xs text-muted">
                Use a different email or restart signup
              </Link>
              <Link to="/login" className="mt-3 block text-center text-xs text-brand-strong">
                Already verified? Sign in
              </Link>
            </>
          ) : (
            <>
              <h2 className="text-[29px] font-bold tracking-[-1px]">
                {register ? 'Create your account' : 'Good to have you back'}
              </h2>
              <p className="mb-7 mt-3 text-sm leading-6 text-muted">
                {register
                  ? 'Tell us about yourself. We’ll verify your email before creating the account.'
                  : 'Sign in with your verified email and password.'}
              </p>
              <form onSubmit={submit} className="space-y-4">
                {register &&
                  input('fullName', 'Full name', {
                    autoComplete: 'name',
                    minLength: 2,
                    maxLength: 100,
                    placeholder: 'Your full name',
                  })}
                {input('email', 'Email address', {
                  type: 'email',
                  autoComplete: 'email',
                  maxLength: 254,
                  placeholder: 'you@example.com',
                })}
                {register && (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {input('birthday', 'Birthday', {
                        type: 'date',
                        max: localDate(),
                        min: '1900-01-01',
                      })}
                      {select('sex', 'Sex', [
                        ['', 'Choose an option'],
                        ['male', 'Male'],
                        ['female', 'Female'],
                        ['prefer-not-to-say', 'Prefer not to say'],
                      ])}
                    </div>
                    {input('address', 'Address', {
                      autoComplete: 'street-address',
                      minLength: 5,
                      maxLength: 300,
                      placeholder: 'House / street, city',
                    })}
                    {input('phone', 'Phone number', {
                      type: 'tel',
                      autoComplete: 'tel',
                      maxLength: 25,
                      placeholder: '0917 555 0123',
                    })}
                    <div className="grid grid-cols-2 gap-4">
                      {input('weight', 'Weight (kg)', {
                        type: 'number',
                        min: 20,
                        max: 500,
                        step: 0.1,
                      })}
                      {input('height', 'Height (cm)', {
                        type: 'number',
                        min: 50,
                        max: 250,
                        step: 0.1,
                      })}
                    </div>
                    {calculatedBmi && (
                      <p className="rounded-lg bg-orange-50 px-3 py-2 text-xs text-brand-strong">
                        BMI: <strong>{calculatedBmi}</strong> · Shown on your profile after
                        verification.
                      </p>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                      {select('membership', 'Membership', [
                        ['monthly', 'Monthly · 1 month'],
                        ['quarterly', 'Monthly · 3 months'],
                        ['half-year', 'Monthly · 6 months'],
                        ['annual', 'Yearly · 12 months'],
                        ['day', 'Daily / per session'],
                      ])}
                      {select('rateCategory', 'Rate category', [
                        ['', 'Choose a category'],
                        ['student', 'Student'],
                        ['nonStudent', 'Non-student'],
                      ])}
                    </div>
                    <p className="text-xs leading-5 text-muted">
                      This records your preferred membership. Pay at the counter; the admin
                      activates your access afterward.
                    </p>
                  </>
                )}
                <Field
                  label="Password"
                  hint={
                    register
                      ? 'Use 12–128 characters. Spaces and passphrases are welcome.'
                      : undefined
                  }
                >
                  <div className="relative">
                    <input
                      className="input h-11 pr-11"
                      aria-label="Password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={change}
                      autoComplete={register ? 'new-password' : 'current-password'}
                      required
                      minLength={register ? 12 : 1}
                      maxLength={128}
                      disabled={busy}
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
                  {fields.password && (
                    <p className="mt-1 text-xs text-rose-600">{fields.password}</p>
                  )}
                </Field>
                {error && (
                  <p role="alert" className="text-xs leading-5 text-rose-600">
                    {error}
                  </p>
                )}
                <Button className="mt-2 h-11 w-full" type="submit" disabled={busy}>
                  {busy ? 'Please wait…' : register ? 'Send verification code' : 'Sign in'}
                  <ArrowRight size={16} />
                </Button>
              </form>
              <p className="mt-6 text-center text-xs text-muted">
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
                Your email must be verified before you can sign in.
              </p>
            </>
          )}
        </div>
      </main>
      <Toast />
    </div>
  );
}
