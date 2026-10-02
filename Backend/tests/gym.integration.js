import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { hmac } from '../src/utils/security.js';
import { membershipEnd, gymDate } from '../src/services/gym.service.js';
export async function gymTests({ t, db, models, env, client, register, post }) {
  const admin = await client(),
    member = await client(),
    other = await client();
  const a = await register(admin),
    m = await register(member),
    o = await register(other);
  await models.User.update({ role: 'admin' }, { where: { id: a.user.id } });
  const send = (c, path, body, method = 'post') =>
    c.agent[method](`/api/v1/gym${path}`)
      .set('Origin', env.FRONTEND_ORIGIN)
      .set('X-CSRF-Token', c.csrf)
      .send(body);
  const activation = (overrides = {}) => ({
    requestId: randomUUID(),
    planId: 'monthly',
    rateCategory: 'student',
    paymentConfirmed: true,
    ...overrides,
  });
  const qr = async () =>
    (await admin.agent.get('/api/v1/gym/attendance/qr').expect(200)).body.token;
  const scan = (token, action = 'time-in', overrides = {}) => ({
    requestId: randomUUID(),
    token,
    action,
    ...overrides,
  });
  await t.test('gym permissions, strict validation, and counter confirmation', async () => {
    await member.agent.get('/api/v1/gym/attendance/qr').expect(403);
    await member.agent.get('/api/v1/gym/audit').expect(403);
    await send(member, `/members/${m.user.id}/access`, activation()).expect(403);
    await send(admin, '/attendance/scan', scan(await qr())).expect(403);
    await send(
      admin,
      `/members/${m.user.id}/access`,
      activation({ paymentConfirmed: false }),
    ).expect(400);
    await send(admin, `/members/${m.user.id}/access`, activation({ listedRate: 1 })).expect(400);
    await send(admin, '/members/not-a-uuid/access', activation()).expect(400);
    await admin.agent.get('/api/v1/gym/attendance?date=2026-02-30').expect(400);
    await admin.agent.get('/api/v1/gym/audit?limit=101').expect(400);
    await member.agent
      .post('/api/v1/gym/attendance/scan')
      .send(scan(await qr()))
      .expect(403);
    await send(
      member,
      '/attendance/scan',
      scan(await qr(), 'time-in', { memberId: o.user.id }),
    ).expect(400);
  });
  await t.test('server rates, calendar expiry, and idempotent membership activation', async () => {
    const input = activation();
    const first = await send(admin, `/members/${m.user.id}/access`, input).expect(200);
    const retry = await send(admin, `/members/${m.user.id}/access`, input).expect(200);
    assert.deepEqual(retry.body, first.body);
    assert.equal(first.body.access.listedRate, 1500);
    assert.equal(first.body.access.start, gymDate());
    assert.equal(membershipEnd('2024-01-31', 1), '2024-02-29');
    assert.equal(membershipEnd('2026-01-31', 1), '2026-02-28');
    await send(admin, `/members/${m.user.id}/access`, { ...input, planId: 'annual' }).expect(409);
    const own = await member.agent.get('/api/v1/gym/state').expect(200);
    assert.deepEqual(
      own.body.members.map((v) => v.id),
      [m.user.id],
    );
    assert.equal(own.body.members[0].access.id, first.body.access.id);
  });
  await t.test(
    'expired, tampered, wrong-purpose QR codes and inactive access are rejected',
    async () => {
      const token = await qr(),
        claims = jwt.decode(token);
      const key = hmac(env.CODE_SECRET, 'gym-attendance-qr-v1');
      const expired = jwt.sign({ ...claims, iat: claims.iat - 200, exp: claims.exp - 200 }, key);
      const wrong = jwt.sign({ ...claims, purpose: 'login' }, key);
      await send(member, '/attendance/scan', scan(expired)).expect(400);
      await send(member, '/attendance/scan', scan(`${token.slice(0, -4)}xxxx`)).expect(400);
      await send(member, '/attendance/scan', scan(wrong)).expect(400);
      await send(other, '/attendance/scan', scan(token)).expect(403);
      await send(
        admin,
        `/members/${m.user.id}/access/status`,
        { status: 'suspended' },
        'put',
      ).expect(200);
      await send(member, '/attendance/scan', scan(token)).expect(403);
      await send(admin, `/members/${m.user.id}/access/status`, { status: 'active' }, 'put').expect(
        200,
      );
    },
  );
  await t.test('concurrent scan retries create one visit and one audit event', async () => {
    const input = scan(await qr());
    const responses = await Promise.all([
      send(member, '/attendance/scan', input),
      send(member, '/attendance/scan', input),
    ]);
    assert.deepEqual(
      responses.map((r) => r.status),
      [200, 200],
    );
    assert.deepEqual(responses[0].body, responses[1].body);
    const id = responses[0].body.visit.id;
    const [counts] = await db.query(
      'SELECT count(*)::int AS total FROM attendance_visits WHERE member_id=$1',
      { bind: [m.user.id] },
    );
    assert.equal(counts[0].total, 1);
    assert.equal(
      await models.Audit.count({ where: { entityId: id, action: 'attendance.time_in' } }),
      1,
    );
    await send(member, '/attendance/scan', scan(input.token)).expect(409);
    await send(member, '/attendance/scan', { ...input, action: 'time-out' }).expect(409);
    const list = await admin.agent.get('/api/v1/gym/attendance?scope=inside').expect(200);
    assert.equal(list.body.visits.find((v) => v.id === id).member.name, m.user.member.name);
    assert.equal(
      (await other.agent.get('/api/v1/gym/attendance?scope=all').expect(200)).body.total,
      0,
    );
    // Time-out remains possible after access is suspended or expires.
    await send(admin, `/members/${m.user.id}/access/status`, { status: 'suspended' }, 'put').expect(
      200,
    );
    const out = await send(member, '/attendance/scan', scan(input.token, 'time-out')).expect(200);
    assert.equal(out.body.visit.id, id);
    assert.ok(new Date(out.body.visit.out) >= new Date(out.body.visit.in));
    await send(member, '/attendance/scan', scan(input.token, 'time-out')).expect(409);
  });
  await t.test(
    'daily pass consumes one admission and cannot be reused after time-out',
    async () => {
      const hour = Number(
        new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Manila',
          hour: '2-digit',
          hourCycle: 'h23',
        }).format(new Date()),
      );
      const slot = hour < 12 ? 'morning' : 'afternoon';
      const created = await send(
        admin,
        `/members/${o.user.id}/access`,
        activation({ planId: 'day', rateCategory: 'nonStudent', timeSlot: slot }),
      ).expect(200);
      assert.equal(created.body.access.listedRate, slot === 'morning' ? 150 : 200);
      const token = await qr();
      if (hour < 7) {
        await send(other, '/attendance/scan', scan(token)).expect(403);
        return;
      }
      const input = scan(token);
      const r = await Promise.all([
        send(other, '/attendance/scan', input),
        send(other, '/attendance/scan', scan(token)),
      ]);
      assert.deepEqual(r.map((v) => v.status).sort(), [200, 409]);
      const state = await other.agent.get('/api/v1/gym/state').expect(200);
      assert.equal(state.body.members[0].access.sessions, 0);
      await send(other, '/attendance/scan', scan(token, 'time-out')).expect(200);
      await send(other, '/attendance/scan', scan(token)).expect(403);
      const wrongSlot = slot === 'morning' ? 'afternoon' : 'morning';
      await send(
        admin,
        `/members/${o.user.id}/access`,
        activation({ planId: 'day', timeSlot: wrongSlot }),
      ).expect(200);
      await send(other, '/attendance/scan', scan(token)).expect(403);
    },
  );
  await t.test(
    'audit entries are admin-only, filterable, and append-only without secrets',
    async () => {
      const list = await admin.agent
        .get('/api/v1/gym/audit?action=attendance.time_in&limit=1')
        .expect(200);
      assert.equal(list.body.entries.length, 1);
      assert.ok(list.body.total >= 1);
      assert.equal(list.body.entries[0].action, 'attendance.time_in');
      const entry = list.body.entries[0];
      await assert.rejects(
        () => models.Audit.update({ action: 'modified' }, { where: { id: entry.id } }),
        /append-only/,
      );
      await assert.rejects(() => models.Audit.destroy({ where: { id: entry.id } }), /append-only/);
      await assert.rejects(() => db.query('TRUNCATE audit_logs'), /append-only/);
      const all = await models.Audit.findAll();
      const stored = JSON.stringify(all.map((v) => v.details));
      assert.ok(
        !stored.includes('password') &&
          !stored.includes('@example.test') &&
          !stored.includes('token'),
      );
      await member.agent.get(`/api/v1/gym/audit?actorId=${a.user.id}`).expect(403);
    },
  );
  await t.test('a failed audit write rolls back the whole attendance transaction', async () => {
    await send(admin, `/members/${o.user.id}/access`, activation()).expect(200);
    const token = await qr();
    const [before] = await db.query(
      'SELECT count(*)::int AS total FROM attendance_visits WHERE member_id=$1',
      { bind: [o.user.id] },
    );
    models.Audit.addHook('beforeCreate', 'simulate-audit-failure', (entry) => {
      if (entry.action === 'attendance.time_in' && entry.actorId === o.user.id)
        throw new Error('Simulated audit storage failure');
    });
    try {
      const result = await send(other, '/attendance/scan', scan(token)).expect(500);
      assert.ok(!JSON.stringify(result.body).includes('Simulated'));
      const [after] = await db.query(
        'SELECT count(*)::int AS total FROM attendance_visits WHERE member_id=$1',
        { bind: [o.user.id] },
      );
      assert.equal(after[0].total, before[0].total);
    } finally {
      models.Audit.removeHook('beforeCreate', 'simulate-audit-failure');
    }
    await send(other, '/attendance/scan', scan(token)).expect(200);
    await send(other, '/attendance/scan', scan(token, 'time-out')).expect(200);
  });
  await t.test('logging out the QR issuer invalidates the displayed code', async () => {
    const token = await qr();
    await post(admin, 'logout', {}).expect(200);
    await send(member, '/attendance/scan', scan(token)).expect(400);
  });
}
