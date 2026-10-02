import { useEffect, useState } from 'react';
import { Save, RotateCcw, CheckCircle2, Scale, Ruler, ShieldCheck } from 'lucide-react';
import { Panel, PageTitle, Avatar, Field, Button, dateLabel } from './UI';
import { localDate } from '../lib/domain';
import { useGym } from '../context/GymContext';
const fieldsFor = (m) => ({
  fullName: m.name || '',
  birthday: m.birthday || '',
  sex: m.sex || '',
  address: m.address || '',
  phone: m.phone || '',
  weight: m.weight ?? '',
  height: m.height ?? '',
});
export default function ProfileEditor({ member, card }) {
  const { updateMember, authUser, refreshGym } = useGym();
  const [form, setForm] = useState(() => fieldsFor(member)),
    [version, setVersion] = useState(member.profileVersion),
    [dirty, setDirty] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(''),
    [errors, setErrors] = useState({}),
    [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!dirty && !saving) {
      setForm(fieldsFor(member));
      setVersion(member.profileVersion);
    }
  }, [member, dirty, saving]);
  const change = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setDirty(true);
    setSaved(false);
    setErrors((v) => ({ ...v, [name]: undefined }));
  };
  const reload = () => {
    setForm(fieldsFor(member));
    setVersion(member.profileVersion);
    setDirty(false);
    setError('');
    setErrors({});
    setSaved(false);
  };
  const weight = Number(form.weight),
    height = Number(form.height);
  const validMeasurements = weight >= 20 && weight <= 500 && height >= 50 && height <= 250;
  const currentBmi = validMeasurements ? Number((weight / (height / 100) ** 2).toFixed(1)) : null;
  const input = (name, { label, ...props } = {}) => (
    <input
      className={`input ${errors[name] ? 'border-rose-400' : ''}`}
      name={name}
      aria-label={label || name}
      aria-invalid={!!errors[name]}
      aria-describedby={errors[name] ? `profile-${name}-error` : undefined}
      value={form[name]}
      onChange={change}
      onInput={props.type === 'date' ? change : undefined}
      disabled={saving}
      required={!!authUser}
      {...props}
    />
  );
  const fieldError = (name) =>
    errors[name] && (
      <p id={`profile-${name}-error`} className="mt-1 text-xs text-rose-700">
        {errors[name]}
      </p>
    );
  async function submit(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    setErrors({});
    setSaved(false);
    try {
      const values = {
        ...form,
        fullName: form.fullName.trim(),
        weight: Number(form.weight),
        height: Number(form.height),
      };
      const result = await updateMember(
        member.id,
        authUser ? { ...values, version } : { ...values, name: values.fullName },
      );
      if (result) {
        setDirty(false);
        setSaved(true);
      }
    } catch (e) {
      setError(e.message);
      setErrors(e.fields || {});
      if (e.status === 409) await refreshGym();
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <PageTitle
        title="A little about you"
        description="Your details, your measurements, your starting point."
      />
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Panel className="p-5 sm:p-7">
          <div className="mb-7 flex items-center gap-4">
            <Avatar member={member} size="large" />
            <div>
              <h2 className="text-xl font-bold">{member.name}</h2>
              <p className="mt-1 text-xs text-muted">
                {member.code} · Member since {dateLabel(member.joined)}
              </p>
            </div>
          </div>
          <form className="space-y-5" onSubmit={submit}>
            {error && (
              <p role="alert" className="rounded-xl bg-rose-50 p-4 text-xs leading-5 text-rose-700">
                {error}
              </p>
            )}
            {saved && (
              <p
                role="status"
                className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-xs text-emerald-700"
              >
                <CheckCircle2 size={17} />
                Your profile is saved.
              </p>
            )}
            {dirty && member.profileVersion !== version && (
              <p className="rounded-xl bg-amber-50 p-4 text-xs leading-5 text-amber-800">
                Your saved measurements changed while you were editing. Reload saved details to
                review the latest values.
              </p>
            )}
            <Field label="Full name">
              {input('fullName', {
                label: 'Full name',
                minLength: 2,
                maxLength: 100,
                autoComplete: 'name',
              })}
              {fieldError('fullName')}
            </Field>
            <Field label="Verified email" hint="Your verified account email is kept secure.">
              <div className="relative">
                <input
                  className="input bg-canvas pr-10 text-muted"
                  aria-label="Verified email"
                  type="email"
                  value={member.email}
                  readOnly
                />
                <ShieldCheck size={17} className="absolute right-3 top-3 text-emerald-600" />
              </div>
            </Field>
            <Field label="Phone number">
              {input('phone', {
                label: 'Phone number',
                type: 'tel',
                maxLength: 25,
                autoComplete: 'tel',
                placeholder: '0917 123 4567',
              })}
              {fieldError('phone')}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Birthday">
                {input('birthday', {
                  label: 'Birthday',
                  type: 'date',
                  min: '1900-01-01',
                  max: localDate(),
                  autoComplete: 'bday',
                })}
                {fieldError('birthday')}
              </Field>
              <Field label="Sex">
                <select
                  className="input"
                  name="sex"
                  aria-label="Sex"
                  aria-invalid={!!errors.sex}
                  value={form.sex}
                  onChange={change}
                  required={!!authUser}
                  disabled={saving}
                >
                  <option value="">Choose an option</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
                {fieldError('sex')}
              </Field>
            </div>
            <Field label="Address">
              {input('address', {
                label: 'Address',
                minLength: 5,
                maxLength: 300,
                autoComplete: 'street-address',
              })}
              {fieldError('address')}
            </Field>
            <div className="border-t border-line pt-5">
              <h3 className="mb-4 text-sm font-semibold">Your current measurements</h3>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Weight (kg)">
                  {input('weight', {
                    label: 'Weight (kg)',
                    type: 'number',
                    min: 20,
                    max: 500,
                    step: '0.1',
                    inputMode: 'decimal',
                  })}
                  {fieldError('weight')}
                </Field>
                <Field label="Height (cm)">
                  {input('height', {
                    label: 'Height (cm)',
                    type: 'number',
                    min: 50,
                    max: 250,
                    step: '0.1',
                    inputMode: 'decimal',
                  })}
                  {fieldError('height')}
                </Field>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted">
                Saving a new weight adds a dated entry to your progress journal. Your latest weight
                entry also updates this profile.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 border-t border-line pt-5">
              <Button type="submit" disabled={saving || !dirty}>
                <Save size={15} />
                {saving ? 'Saving…' : 'Save profile'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={saving || !dirty}
                onClick={reload}
              >
                <RotateCcw size={14} />
                Reload saved details
              </Button>
            </div>
          </form>
        </Panel>
        <div className="space-y-5">
          <Panel className="relative overflow-hidden border-orange-100 bg-[#fff7ed] p-6">
            <p className="flex items-center gap-2 text-xs font-semibold text-brand-strong">
              <Scale size={17} />
              Body mass index
            </p>
            <p className="mt-4 text-5xl font-bold tracking-tight">{currentBmi ?? '—'}</p>
            <p className="mt-2 text-xs text-muted">
              {dirty
                ? 'Preview from the measurements you entered'
                : 'Calculated from your saved measurements'}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-orange-200/60 pt-4">
              <div>
                <span className="flex items-center gap-1.5 text-[10px] text-muted">
                  <Scale size={13} />
                  Weight
                </span>
                <p className="mt-1 text-sm font-semibold">{validMeasurements ? weight : '—'} kg</p>
              </div>
              <div>
                <span className="flex items-center gap-1.5 text-[10px] text-muted">
                  <Ruler size={13} />
                  Height
                </span>
                <p className="mt-1 text-sm font-semibold">{validMeasurements ? height : '—'} cm</p>
              </div>
            </div>
            <p className="mt-4 text-[10px] leading-5 text-muted">
              Weight in kilograms divided by height in meters squared. BMI is one measurement in
              your fitness journey.
            </p>
          </Panel>
          {card}
        </div>
      </div>
    </>
  );
}
