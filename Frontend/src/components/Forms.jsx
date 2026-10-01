import { useState } from 'react';
import { ArrowRight, Check, CalendarDays } from 'lucide-react';
import { Modal, Field, Button, dateLabel } from './UI';
import { useGym } from '../context/GymContext';
import { plans, localDate, addDays } from '../lib/domain';

export function MemberCreate({ onClose }) {
  const { createMember } = useGym();
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  return (
    <Modal
      title="Welcome a new member"
      description="Create their profile, then activate access after counter payment."
      onClose={onClose}
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (createMember(form)) onClose();
        }}
      >
        <Field label="Full name">
          <input
            className="input"
            name="name"
            placeholder="e.g. Sofia Reyes"
            value={form.name}
            onChange={change}
            required
            minLength={2}
            maxLength={100}
          />
        </Field>
        <Field label="Email address">
          <input
            className="input"
            name="email"
            type="email"
            placeholder="sofia@example.com"
            value={form.email}
            onChange={change}
            required
            maxLength={150}
          />
        </Field>
        <Field label="Phone number" hint="Optional">
          <input
            className="input"
            name="phone"
            type="tel"
            placeholder="0917 000 0000"
            value={form.phone}
            onChange={change}
            maxLength={30}
          />
        </Field>
        <div className="modal-actions">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            Add member <ArrowRight size={15} />
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export function AccessModal({ member, onClose }) {
  const { activate } = useGym();
  const [planId, setPlanId] = useState(member.access?.planId || 'monthly');
  const [confirmed, setConfirmed] = useState(false);
  const plan = plans.find((p) => p.id === planId);
  const start = localDate();
  return (
    <Modal
      title={member.access ? 'Renew member access' : 'Activate member access'}
      description={`Set up ${member.name.split(' ')[0]}’s next step. Payments are handled at the gym counter.`}
      onClose={onClose}
    >
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (confirmed && activate(member.id, planId, start)) onClose();
        }}
      >
        <Field label="Select a plan">
          <select className="input" value={planId} onChange={(e) => setPlanId(e.target.value)}>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="rounded-xl border border-line bg-canvas p-4">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <CalendarDays size={16} className="text-brand-strong" />
            {dateLabel(start)} → {dateLabel(addDays(start, plan.days))}
          </div>
          <p className="mt-2 text-xs text-muted">
            {plan.sessions === null
              ? 'Unlimited gym visits'
              : `${plan.sessions} ${plan.sessions === 1 ? 'visit' : 'visits'}`}{' '}
            • {plan.days}-day validity
          </p>
          <p className="mt-2 text-[10px] leading-5 text-muted">
            Access starts today. The end date is exclusive; day passes allow one admission.
          </p>
        </div>
        {member.access && (
          <p className="text-xs leading-5 text-muted">
            This starts a new plan today and replaces current access. The previous dates and session
            balance remain in the member’s history.
          </p>
        )}
        <label className="flex items-start gap-3 text-xs leading-5">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 accent-brand"
            required
          />
          <span>
            I have confirmed the member’s payment at the counter and want to activate this access.
          </span>
        </label>
        <div className="modal-actions">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!confirmed} type="submit">
            Activate access <Check size={15} />
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export function ProgressModal({ member, onClose, author = 'admin', entry = null }) {
  const { addProgress, editProgress } = useGym();
  const [form, setForm] = useState(
    entry
      ? { ...entry, value: String(entry.value) }
      : { memberId: member.id, metric: 'Weight', value: '', date: localDate(), notes: '' },
  );
  return (
    <Modal
      title={entry ? 'Update a measurement' : 'Record a little progress'}
      description={`A measurement for ${member.name.split(' ')[0]}. Compare the same metric over time.`}
      onClose={onClose}
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const result = entry ? editProgress(entry.id, form, author) : addProgress(form, author);
          if (result) onClose();
        }}
      >
        <Field label="What are we tracking?">
          <select
            className="input"
            value={form.metric}
            onChange={(e) => setForm({ ...form, metric: e.target.value })}
          >
            <option>Weight</option>
            <option>Bench press</option>
            <option>Waist</option>
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label={`Measurement (${form.metric === 'Waist' ? 'cm' : 'kg'})`}>
            <input
              className="input"
              type="number"
              min="0.1"
              max="1000"
              step="0.1"
              required
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              placeholder="0.0"
            />
          </Field>
          <Field label="Measured on">
            <input
              className="input"
              type="date"
              required
              max={localDate()}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </Field>
        </div>
        <Field
          label="Notes"
          hint={
            form.metric === 'Bench press'
              ? 'Use a consistent repetition count for comparisons.'
              : 'Optional — how did it feel?'
          }
        >
          <textarea
            className="input min-h-24 resize-y"
            maxLength={500}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="A small win worth remembering..."
          />
        </Field>
        <div className="modal-actions">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            Save progress <Check size={15} />
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export function GoalModal({ member, onClose }) {
  const { saveGoal } = useGym();
  const [metric, setMetric] = useState('Bench press');
  const [target, setTarget] = useState('');
  return (
    <Modal
      title="Give yourself a goal"
      description="Choose a measurable target that matters to you."
      onClose={onClose}
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          saveGoal({
            memberId: member.id,
            metric,
            target: Number(target),
            unit: metric === 'Waist' ? 'cm' : 'kg',
          });
          onClose();
        }}
      >
        <Field label="Metric">
          <select className="input" value={metric} onChange={(e) => setMetric(e.target.value)}>
            <option>Bench press</option>
            <option>Weight</option>
            <option>Waist</option>
          </select>
        </Field>
        <Field label={`Target (${metric === 'Waist' ? 'cm' : 'kg'})`}>
          <input
            className="input"
            type="number"
            step="0.1"
            min="0.1"
            max="1000"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            required
            placeholder="e.g. 60"
          />
        </Field>
        <div className="modal-actions">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            Set goal <ArrowRight size={15} />
          </Button>
        </div>
      </form>
    </Modal>
  );
}
