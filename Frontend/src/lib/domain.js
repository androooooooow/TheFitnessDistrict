export const ZONE = 'Asia/Manila';
export function localDate(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  return ['year', 'month', 'day']
    .map((key) => parts.find((part) => part.type === key).value)
    .join('-');
}
export function addDays(date, days) {
  const value = new Date(`${date}T12:00:00+08:00`);
  value.setUTCDate(value.getUTCDate() + days);
  return localDate(value);
}
function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00+08:00`);
  return !Number.isNaN(parsed.getTime()) && localDate(parsed) === value;
}
export const plans = [
  {
    id: 'monthly',
    name: 'District Monthly',
    short: 'Monthly',
    type: 'membership',
    days: 30,
    sessions: null,
    description: 'Your everyday commitment. Unlimited gym visits for 30 days.',
    features: ['Unlimited visits', '30-day access', 'Progress tracking'],
    color: 'orange',
  },
  {
    id: 'sessions',
    name: '10-Session Pack',
    short: 'Session pack',
    type: 'sessions',
    days: 90,
    sessions: 10,
    description: 'A little flexibility goes a long way. Train on your schedule.',
    features: ['10 gym visits', '90-day validity', 'Progress tracking'],
    color: 'blue',
  },
  {
    id: 'day',
    name: 'Day Pass',
    short: 'Day pass',
    type: 'day',
    days: 1,
    sessions: 1,
    description: 'One visit. A fresh start. Make today your day.',
    features: ['One gym visit', 'Same-day validity', 'Full gym access'],
    color: 'purple',
  },
];
export function accessStatus(member, now = new Date()) {
  if (member.status === 'disabled') return 'Suspended';
  const a = member.access;
  if (!a || a.status === 'pending') return 'Pending';
  if (a.status === 'suspended') return 'Suspended';
  if (a.status === 'revoked') return 'Revoked';
  const date = localDate(now);
  if (date < a.start) return 'Scheduled';
  if (date >= a.end) return 'Expired';
  if (a.sessions !== null && a.sessions <= 0) return 'Exhausted';
  return 'Active';
}
export const uid = () => crypto.randomUUID();
export function checkIn(state, memberId, now = new Date().toISOString()) {
  const member = state.members.find((m) => m.id === memberId);
  if (!member) throw new Error('Member not found.');
  if (state.visits.some((v) => v.memberId === memberId && !v.out))
    return { state, message: `${member.name.split(' ')[0]} is already checked in.` };
  const status = accessStatus(member, now);
  if (status !== 'Active')
    throw new Error(
      `Cannot check in: access is ${status.toLowerCase()}. Ask the admin to update this membership.`,
    );
  const members = state.members.map((m) =>
    m.id === memberId
      ? {
          ...m,
          access: {
            ...m.access,
            sessions: m.access.sessions === null ? null : m.access.sessions - 1,
          },
        }
      : m,
  );
  const visit = { id: uid(), memberId, accessId: member.access.id, in: now, out: null };
  return {
    state: { ...state, members, visits: [visit, ...state.visits] },
    message: `${member.name.split(' ')[0]} checked in. Have a great workout!`,
  };
}
export function checkOut(state, visitId, now = new Date().toISOString()) {
  const visit = state.visits.find((v) => v.id === visitId);
  if (!visit) throw new Error('Visit not found.');
  if (visit.out) return { state, message: 'This visit is already checked out.' };
  if (new Date(now) < new Date(visit.in)) throw new Error('Check-out cannot be before check-in.');
  return {
    state: {
      ...state,
      visits: state.visits.map((v) => (v.id === visitId ? { ...v, out: now } : v)),
    },
    message: 'Checked out. See you next time!',
  };
}
export function activateAccess(state, memberId, planId, start = localDate()) {
  const member = state.members.find((m) => m.id === memberId);
  const plan = plans.find((p) => p.id === planId);
  if (!member || !plan) throw new Error('Choose a valid member and plan.');
  if (!isValidDate(start)) throw new Error('Choose a valid start date.');
  const access = {
    id: uid(),
    planId,
    status: 'active',
    start,
    end: addDays(start, plan.days),
    sessions: plan.sessions,
    totalSessions: plan.sessions,
  };
  return {
    state: {
      ...state,
      members: state.members.map((m) =>
        m.id === memberId
          ? { ...m, access, history: [...(m.history || []), ...(m.access ? [m.access] : [])] }
          : m,
      ),
    },
    message: `${plan.name} activated for ${member.name.split(' ')[0]}.`,
  };
}
export function setAccessStatus(state, memberId, status) {
  const member = state.members.find((m) => m.id === memberId);
  if (!member?.access) throw new Error('Activate a membership first.');
  if (!['active', 'suspended', 'revoked'].includes(status))
    throw new Error('Invalid access status.');
  return {
    state: {
      ...state,
      members: state.members.map((m) =>
        m.id === memberId ? { ...m, access: { ...m.access, status } } : m,
      ),
    },
    message:
      status === 'active'
        ? 'Access resumed. Dates and remaining sessions are preserved.'
        : 'Access suspended.',
  };
}
export function createMember(state, input) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error('Enter a name and a valid email address.');
  if (state.members.some((m) => m.email.toLowerCase() === email))
    throw new Error('A member with this email already exists.');
  const member = {
    id: uid(),
    code: `FD-${String(Math.max(1000, ...state.members.map((m) => Number(m.code.split('-')[1]) || 1000)) + 1)}`,
    name,
    email,
    phone: input.phone || '',
    joined: localDate(),
    status: 'enabled',
    color: state.members.length % 6,
    access: null,
    history: [],
  };
  return {
    state: { ...state, members: [member, ...state.members] },
    message: `${name.split(' ')[0]} added. Activate their access after counter payment.`,
    member,
  };
}
export function addProgress(state, input, author = 'admin') {
  if (!state.members.some((m) => m.id === input.memberId)) throw new Error('Choose a member.');
  const value = Number(input.value);
  const allowed = { Weight: 'kg', 'Bench press': 'kg', Waist: 'cm' };
  if (!allowed[input.metric] || !Number.isFinite(value) || value <= 0 || value > 1000)
    throw new Error('Enter a measurement between 0 and 1,000.');
  if (!isValidDate(input.date) || input.date > localDate())
    throw new Error('Choose a measurement date on or before today.');
  const entry = {
    id: uid(),
    memberId: input.memberId,
    metric: input.metric,
    value,
    unit: allowed[input.metric],
    date: input.date,
    notes: input.notes?.trim().slice(0, 500) || '',
    author,
  };
  return {
    state: { ...state, progress: [...state.progress, entry] },
    message: 'Progress saved. Every step counts.',
  };
}
export function editProgress(state, entryId, input, author = 'admin') {
  const original = state.progress.find((p) => p.id === entryId);
  if (
    !original ||
    (author !== 'admin' && (original.author !== author || original.memberId !== author))
  )
    throw new Error('You can edit only progress entries you recorded for yourself.');
  const validated = addProgress(
    state,
    { ...input, memberId: original.memberId },
    original.author,
  ).state.progress.at(-1);
  return {
    state: {
      ...state,
      progress: state.progress.map((p) =>
        p.id === entryId ? { ...validated, id: entryId, author: original.author } : p,
      ),
    },
    message: 'Progress entry updated.',
  };
}
