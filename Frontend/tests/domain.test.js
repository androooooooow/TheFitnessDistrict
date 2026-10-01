import test from 'node:test';
import assert from 'node:assert/strict';
import {
  accessStatus,
  checkIn,
  checkOut,
  activateAccess,
  setAccessStatus,
  createMember,
  addProgress,
  editProgress,
  localDate,
  addMonths,
  rateFor,
} from '../src/lib/domain.js';
import { csvCell } from '../src/lib/export.js';

const now = '2026-10-01T08:30:00+08:00';
const makeState = (overrides = {}) => ({
  members: [
    {
      id: 'm1',
      name: 'Sample Member',
      code: 'FD-1001',
      email: 'sample@example.com',
      status: 'enabled',
      history: [],
      access: {
        id: 'a1',
        planId: 'sessions',
        status: 'active',
        start: '2026-09-01',
        end: '2026-10-02',
        sessions: 1,
        totalSessions: 10,
      },
      ...overrides,
    },
  ],
  visits: [],
  progress: [],
  goals: [],
});

test('Manila dates and exclusive expiry use the correct local day', () => {
  const member = makeState().members[0];
  assert.equal(localDate('2026-10-01T16:00:00Z'), '2026-10-02');
  assert.equal(accessStatus(member, '2026-10-01T15:59:59Z'), 'Active');
  assert.equal(accessStatus(member, '2026-10-01T16:00:00Z'), 'Expired');
});
test('repeat check-in consumes one session and creates one open visit', () => {
  const first = checkIn(makeState(), 'm1', now);
  const again = checkIn(first.state, 'm1', now);
  assert.equal(again.state.visits.length, 1);
  assert.equal(again.state.members[0].access.sessions, 0);
  assert.equal(again.state, first.state);
});
test('an exhausted pack cannot start another visit after checkout', () => {
  const first = checkIn(makeState(), 'm1', now);
  const out = checkOut(first.state, first.state.visits[0].id, '2026-10-01T09:30:00+08:00');
  assert.throws(() => checkIn(out.state, 'm1', '2026-10-01T10:00:00+08:00'), /exhausted/);
});
test('checkout still works after expiry and retries preserve the original time', () => {
  const first = checkIn(makeState(), 'm1', now);
  const id = first.state.visits[0].id;
  const out = checkOut(first.state, id, '2026-10-02T09:00:00+08:00');
  const retry = checkOut(out.state, id, '2026-10-02T10:00:00+08:00');
  assert.equal(retry.state.visits[0].out, '2026-10-02T09:00:00+08:00');
  assert.equal(retry.state.members[0].access.sessions, 0);
});
test('checkout cannot precede check-in', () => {
  const first = checkIn(makeState(), 'm1', now);
  assert.throws(
    () => checkOut(first.state, first.state.visits[0].id, '2026-10-01T07:00:00+08:00'),
    /before/,
  );
});
test('pending and suspended members cannot check in', () => {
  assert.throws(() => checkIn(makeState({ access: null }), 'm1', now), /pending/);
  assert.throws(() => checkIn(makeState({ status: 'disabled' }), 'm1', now), /suspended/);
});
test('renewal preserves previous access and records the selected membership rate', () => {
  const state = makeState();
  const next = activateAccess(state, 'm1', 'quarterly', '2026-10-01', {
    rateCategory: 'student',
  }).state;
  assert.equal(next.members[0].access.sessions, null);
  assert.equal(next.members[0].access.end, '2027-01-01');
  assert.equal(next.members[0].access.listedRate, 3500);
  assert.equal(next.members[0].access.rateCategory, 'student');
  assert.deepEqual(next.members[0].history, [state.members[0].access]);
  assert.notEqual(next.members[0].access.id, 'a1');
});
test('calendar month durations clamp month ends, including leap years', () => {
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(addMonths('2028-01-31', 1), '2028-02-29');
  assert.equal(addMonths('2028-02-29', 12), '2029-02-28');
  assert.equal(addMonths('2026-10-01', 6), '2027-04-01');
});
test('catalog rates match the supplied student and non-student poster', () => {
  for (const [id, student, nonStudent] of [
    ['monthly', 1500, 2000],
    ['quarterly', 3500, 5000],
    ['half-year', 6500, 9500],
    ['annual', 11000, 18000],
  ]) {
    assert.equal(rateFor(id, 'student'), student);
    assert.equal(rateFor(id, 'nonStudent'), nonStudent);
  }
  assert.equal(rateFor('day', 'student', 'morning'), 100);
  assert.equal(rateFor('day', 'nonStudent', 'morning'), 150);
  assert.equal(rateFor('day', 'student', 'afternoon'), 150);
  assert.equal(rateFor('day', 'nonStudent', 'afternoon'), 200);
  assert.throws(() => rateFor('day', 'student', 'invalid'), /entry time/);
  assert.throws(() => rateFor('annual', 'invalid'), /category/);
  assert.throws(
    () => activateAccess(makeState(), 'm1', 'sessions', '2026-10-01'),
    /valid member and plan/,
  );
});
test('daily pass respects Manila entry time, noon boundary, and single admission', () => {
  const morning = activateAccess(makeState(), 'm1', 'day', '2026-10-01', {
    rateCategory: 'student',
    timeSlot: 'morning',
  }).state;
  assert.equal(morning.members[0].access.end, '2026-10-02');
  assert.throws(() => checkIn(morning, 'm1', '2026-10-01T06:59:00+08:00'), /allows check-in/);
  assert.throws(() => checkIn(morning, 'm1', '2026-10-01T12:00:00+08:00'), /allows check-in/);
  const checked = checkIn(morning, 'm1', '2026-10-01T11:59:00+08:00').state;
  const out = checkOut(checked, checked.visits[0].id, '2026-10-01T13:00:00+08:00').state;
  assert.throws(() => checkIn(out, 'm1', '2026-10-01T13:01:00+08:00'), /exhausted/);
  const afternoon = activateAccess(makeState(), 'm1', 'day', '2026-10-01', {
    rateCategory: 'nonStudent',
    timeSlot: 'afternoon',
  }).state;
  assert.equal(checkIn(afternoon, 'm1', '2026-10-01T04:00:00Z').state.visits.length, 1);
  assert.throws(() => checkIn(afternoon, 'm1', '2026-10-01T11:59:00+08:00'), /allows check-in/);
});
test('resuming access preserves dates and does not credit more sessions', () => {
  const suspended = setAccessStatus(makeState(), 'm1', 'suspended').state;
  const resumed = setAccessStatus(suspended, 'm1', 'active').state;
  assert.equal(resumed.members[0].access.sessions, 1);
  assert.equal(resumed.members[0].access.end, '2026-10-02');
});
test('new members start without activated access and emails are unique', () => {
  const next = createMember(makeState(), { name: 'New Member', email: 'NEW@example.com' });
  assert.equal(next.member.access, null);
  assert.equal(next.member.email, 'new@example.com');
  assert.throws(
    () => createMember(next.state, { name: 'Other Member', email: 'new@example.com' }),
    /already exists/,
  );
});
test('users can edit their own authored progress but not admin measurements', () => {
  const input = { memberId: 'm1', metric: 'Weight', value: '72', date: '2026-01-01' };
  const own = addProgress(makeState(), input, 'm1').state;
  const id = own.progress[0].id;
  const updated = editProgress(own, id, { ...input, value: '73' }, 'm1').state;
  assert.equal(updated.progress[0].value, 73);
  assert.equal(updated.progress[0].id, id);
  const admin = addProgress(makeState(), input, 'admin').state;
  assert.throws(
    () => editProgress(admin, admin.progress[0].id, input, 'm1'),
    /only progress entries/,
  );
});
test('progress rejects invalid values and future dates', () => {
  assert.throws(
    () =>
      addProgress(makeState(), {
        memberId: 'm1',
        metric: 'Weight',
        value: '0',
        date: '2026-01-01',
      }),
    /measurement/,
  );
  assert.throws(
    () =>
      addProgress(makeState(), {
        memberId: 'm1',
        metric: 'Weight',
        value: '70',
        date: '2099-01-01',
      }),
    /date/,
  );
  assert.throws(
    () =>
      addProgress(makeState(), {
        memberId: 'm1',
        metric: 'Weight',
        value: '70',
        date: '2026-02-30',
      }),
    /date/,
  );
});
test('CSV exports escape quotes and prevent spreadsheet formula injection', () => {
  assert.equal(csvCell('A "quoted" name'), '"A ""quoted"" name"');
  assert.equal(csvCell('=1+1'), '"\'=1+1"');
  assert.equal(csvCell('Alex Morgan'), '"Alex Morgan"');
});
