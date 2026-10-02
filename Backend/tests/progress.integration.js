import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { encrypt, decrypt } from '../src/utils/security.js';
import { today } from '../src/validators/auth.schema.js';
export async function progressTests({ t, db, models, env, client, register }) {
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
  const input = (overrides = {}) => ({
    memberId: m.user.id,
    requestId: randomUUID(),
    metric: 'Weight',
    value: 80,
    date: today(),
    notes: 'Feeling steady',
    ...overrides,
  });
  const own = async (c) => (await c.agent.get('/api/v1/gym/progress').expect(200)).body;
  const profile = async (c) => (await c.agent.get('/api/v1/me').expect(200)).body.user.member;
  let latestId;
  await t.test(
    'registration starts an encrypted weight journal and progress enforces ownership',
    async () => {
      const data = await own(member);
      assert.equal(data.total, 1);
      assert.equal(data.summary.latest.value, 75);
      assert.equal(data.entries[0].source, 'profile');
      await member.agent.get(`/api/v1/gym/progress?memberId=${o.user.id}`).expect(404);
      await send(member, '/progress', input({ memberId: o.user.id })).expect(404);
      await member.agent.post('/api/v1/gym/progress').send(input()).expect(403);
      for (const extra of [
        { author: 'admin' },
        { unit: 'lb' },
        { role: 'admin' },
        { value: 0 },
        { value: Infinity },
        { date: '2099-01-01' },
        { date: '2026-02-30' },
        { notes: '<script>alert(1)</script>' },
      ])
        await send(member, '/progress', input(extra)).expect(400);
      await admin.agent.get('/api/v1/gym/progress').expect(400);
    },
  );
  await t.test(
    'concurrent progress retries save once and latest dated weight drives profile BMI',
    async () => {
      const body = input();
      const result = await Promise.all([
        send(member, '/progress', body),
        send(member, '/progress', body),
      ]);
      assert.deepEqual(
        result.map((r) => r.status),
        [200, 200],
      );
      assert.deepEqual(result[0].body, result[1].body);
      latestId = result[0].body.id;
      assert.equal(
        await models.Audit.count({ where: { action: 'progress.recorded', entityId: latestId } }),
        1,
      );
      const data = await own(member);
      assert.equal(data.total, 2);
      assert.equal(data.summary.latest.id, latestId);
      const p = await profile(member);
      assert.equal(p.weight, 80);
      assert.equal(p.bmi, 26.1);
      const yesterday = new Date(`${today()}T12:00:00Z`);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      await send(
        member,
        '/progress',
        input({ value: 70, date: yesterday.toISOString().slice(0, 10) }),
      ).expect(200);
      assert.equal((await profile(member)).weight, 80);
      await send(member, '/progress', { ...body, value: 85 }).expect(409);
      const stored = await models.Progress.findByPk(latestId);
      assert.ok(!stored.encryptedData.includes(body.notes));
      assert.equal(decrypt(stored.encryptedData, env.FIELD_ENCRYPTION_KEY, 'progress').value, 80);
      assert.throws(() => decrypt(stored.encryptedData, env.FIELD_ENCRYPTION_KEY));
      const [requests] = await db.query(
        'SELECT result FROM gym_requests WHERE actor_id=$1 AND request_id=$2',
        { bind: [m.user.id, body.requestId] },
      );
      assert.deepEqual(Object.keys(requests[0].result).sort(), ['id', 'message']);
    },
  );
  await t.test(
    'users edit their own entries, admins edit any entry, stale versions cannot overwrite changes',
    async () => {
      const edit = {
        metric: 'Weight',
        value: 78,
        date: today(),
        notes: 'Updated measurement',
        version: 1,
      };
      await send(other, `/progress/${latestId}`, edit, 'put').expect(404);
      await send(member, `/progress/${latestId}`, edit, 'put').expect(200);
      assert.equal((await profile(member)).weight, 78);
      await send(member, `/progress/${latestId}`, { ...edit, value: 79 }, 'put').expect(409);
      const adminEntry = await send(
        admin,
        '/progress',
        input({ value: 81, notes: 'Admin measurement' }),
      ).expect(200);
      await send(member, `/progress/${adminEntry.body.id}`, edit, 'put').expect(404);
      await send(admin, `/progress/${latestId}`, { ...edit, value: 77, version: 2 }, 'put').expect(
        200,
      );
      assert.equal((await profile(member)).weight, 81);
      const data = await admin.agent.get(`/api/v1/gym/progress?memberId=${m.user.id}`).expect(200);
      assert.equal(data.body.entries.find((e) => e.id === latestId).author, m.user.id);
      assert.equal((await own(other)).total, 1);
    },
  );
  await t.test(
    'profile changes persist, add a weight log only when needed, and reject stale forms',
    async () => {
      const prior = await profile(member);
      const { email, password, membership, rateCategory, ...fields } = m.input;
      const body = {
        ...fields,
        fullName: 'Updated QA Member',
        weight: 82,
        height: 180,
        version: prior.profileVersion,
      };
      const put = (body) =>
        member.agent
          .put('/api/v1/me/profile')
          .set('Origin', env.FRONTEND_ORIGIN)
          .set('X-CSRF-Token', member.csrf)
          .send(body);
      const count = (await own(member)).total;
      const saved = await put(body).expect(200);
      assert.equal(saved.body.user.member.bmi, 25.3);
      assert.equal((await own(member)).total, count + 1);
      const current = await profile(member);
      assert.equal(current.name, body.fullName);
      await put({ ...body, fullName: 'Stale edit' }).expect(409);
      await put({ ...body, weight: 2, version: current.profileVersion }).expect(400);
      await put({ ...body, role: 'admin', version: current.profileVersion }).expect(400);
      await put({ ...body, phone: '09179876543', version: current.profileVersion }).expect(200);
      assert.equal((await own(member)).total, count + 1);
      assert.equal((await profile(other)).weight, 75);
    },
  );
  await t.test(
    'goals are encrypted, idempotent, range checked, and scoped to the member',
    async () => {
      const body = { memberId: m.user.id, metric: 'Weight', target: 76, requestId: randomUUID() };
      await send(other, '/goals', body).expect(404);
      await send(member, '/goals', { ...body, target: 0 }).expect(400);
      const first = await send(member, '/goals', body).expect(200);
      assert.deepEqual((await send(member, '/goals', body).expect(200)).body, first.body);
      const stored = await models.Goal.findByPk(first.body.id);
      const data = decrypt(stored.encryptedData, env.FIELD_ENCRYPTION_KEY, 'goal');
      assert.equal(data.target, 76);
      assert.equal(data.baseline, 82);
      const goal = (await own(member)).goals[0];
      assert.equal(goal.target, 76);
      await send(member, '/goals', {
        ...body,
        target: 78,
        requestId: randomUUID(),
      }).expect(409);
      await send(member, '/goals', {
        ...body,
        target: 77,
        version: goal.version,
        requestId: randomUUID(),
      }).expect(200);
      await send(member, '/goals', {
        ...body,
        target: 78,
        version: goal.version,
        requestId: randomUUID(),
      }).expect(409);
      assert.equal((await own(other)).goals.length, 0);
      const logs = await models.Audit.findAll({ where: { entityId: first.body.id } });
      assert.equal(logs.length, 2);
      assert.ok(!JSON.stringify(logs.map((l) => l.details)).includes('target'));
    },
  );
  await t.test(
    'journal pagination keeps full history, charts are bounded, summaries use all measurements',
    async () => {
      const entries = Array.from({ length: 201 }, (_, i) => ({
        id: randomUUID(),
        memberId: o.user.id,
        metric: 'Bench press',
        date: today(),
        encryptedData: encrypt({ value: 100 + i, notes: '' }, env.FIELD_ENCRYPTION_KEY, 'progress'),
        source: 'journal',
        createdBy: o.user.id,
        authorRole: 'user',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      await models.Progress.bulkCreate(entries);
      t.diagnostic('Checking paginated progress with 201 measurements.');
      const data = await other.agent
        .get('/api/v1/gym/progress?metric=Bench%20press&limit=25&offset=25')
        .expect(200);
      assert.equal(data.body.total, 202);
      assert.equal(data.body.entries.length, 25);
      assert.equal(data.body.summary.count, 201);
      assert.equal(data.body.chart.length, 200);
      assert.equal(data.body.chartLimited, true);
      assert.equal(data.body.summary.first.value, 100);
      assert.equal(data.body.summary.latest.value, 300);
      t.diagnostic('Checking the member-scoped dashboard snapshot.');
      const state = await member.agent.get('/api/v1/gym/state').expect(200);
      assert.ok(state.body.progress.every((e) => e.memberId === m.user.id));
      assert.ok(state.body.goals.every((g) => g.memberId === m.user.id));
    },
  );
  await t.test(
    'a failed progress audit rolls back the measurement and profile weight',
    async () => {
      const before = await models.Progress.count({ where: { memberId: m.user.id } });
      models.Audit.addHook('beforeCreate', 'progress-audit-failure', (entry) => {
        if (entry.action === 'progress.recorded' && entry.actorId === m.user.id)
          throw new Error('Simulated audit failure');
      });
      try {
        await send(member, '/progress', input({ value: 84 })).expect(500);
        assert.equal(await models.Progress.count({ where: { memberId: m.user.id } }), before);
        assert.equal((await profile(member)).weight, 82);
      } finally {
        models.Audit.removeHook('beforeCreate', 'progress-audit-failure');
      }
    },
  );
}
