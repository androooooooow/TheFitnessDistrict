import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { randomBytes } from 'node:crypto';
import { createDatabase } from '../src/config/database.js';
import { defineModels } from '../src/models/index.js';
import { createApp } from '../src/app.js';
import { migrate } from '../scripts/migrate.js';
import { readEnv } from '../src/config/env.js';
import { valid } from './fixtures.js';
const url = process.env.TEST_DATABASE_URL;
if (!url)
  throw new Error(
    'Use npm run test:postgres, or set TEST_DATABASE_URL to a fresh local *_test database.',
  );
const parsed = new URL(url);
if (!['127.0.0.1', 'localhost'].includes(parsed.hostname) || !parsed.pathname.endsWith('_test'))
  throw new Error('Integration tests require a dedicated local *_test database.');
test('PostgreSQL signup, verification, sessions, and profile API', async (t) => {
  const env = readEnv({
    NODE_ENV: 'test',
    FRONTEND_ORIGIN: 'http://127.0.0.1:5173',
    DATABASE_URL: url,
    MAIL_TRANSPORT: 'file',
    ...Object.fromEntries(
      ['JWT_SECRET', 'CODE_SECRET', 'CSRF_SECRET', 'FIELD_ENCRYPTION_KEY'].map((k) => [
        k,
        randomBytes(32).toString('hex'),
      ]),
    ),
  });
  const db = createDatabase(env);
  const models = defineModels(db);
  let number = 0;
  const messages = new Map();
  let failMail = false;
  const mail = {
    sendCode: async (value) => {
      if (failMail) throw new Error('simulated transport failure');
      messages.set(value.challengeId, value);
    },
  };
  try {
    await migrate(db);
    await migrate(db);
    assert.equal(
      await models.User.count(),
      0,
      'Use a fresh test database; existing account data will not be cleared.',
    );
    const app = await createApp({ db, models, env, mail, rateLimits: false });
    async function client() {
      const agent = request.agent(app);
      const boot = await agent.get('/api/v1/auth/csrf').expect(200);
      return {
        agent,
        csrf: boot.body.csrfToken,
        csrfCookie: boot.headers['set-cookie'][0].split(';')[0],
      };
    }
    const post = (c, path, body) =>
      c.agent
        .post(`/api/v1/auth/${path}`)
        .set('Origin', env.FRONTEND_ORIGIN)
        .set('X-CSRF-Token', c.csrf)
        .send(body);
    async function pending(c, overrides = {}) {
      const email = `member-${++number}@example.test`;
      const input = { ...valid, email, ...overrides };
      const response = await post(c, 'signup', input).expect(202);
      return {
        input,
        id: response.body.challengeId,
        code: messages.get(response.body.challengeId)?.code,
        response,
      };
    }
    async function register(c, overrides = {}) {
      const p = await pending(c, overrides);
      const verified = await post(c, 'verify-email', { challengeId: p.id, code: p.code }).expect(
        200,
      );
      return { ...p, user: verified.body.user, response: verified };
    }
    await t.test(
      'rejects invalid fields, permission injection, unsafe origins, and missing CSRF',
      async () => {
        const c = await client();
        await post(c, 'signup', { ...valid, role: 'admin' }).expect(400);
        await post(c, 'signup', { ...valid, height: 1000, birthday: '2026-02-30' }).expect(400);
        await c.agent
          .post('/api/v1/auth/signup')
          .set('Origin', env.FRONTEND_ORIGIN)
          .send(valid)
          .expect(403);
        await c.agent
          .post('/api/v1/auth/signup')
          .set('Origin', 'https://attacker.example')
          .set('X-CSRF-Token', c.csrf)
          .send(valid)
          .expect(403);
        await c.agent
          .post('/api/v1/auth/login')
          .set('Origin', env.FRONTEND_ORIGIN)
          .set('X-CSRF-Token', c.csrf)
          .type('form')
          .send({ email: 'bad' })
          .expect(415);
        assert.equal(await models.User.count(), 0);
      },
    );
    await t.test(
      'no account exists before verification; successful code creates and logs in once',
      async () => {
        const c = await client();
        const p = await pending(c);
        assert.equal(await models.User.count(), 0);
        assert.ok(!JSON.stringify(p.response.body).includes(p.code));
        const challenge = await models.Pending.findByPk(p.id);
        assert.ok(!challenge.encryptedData.includes(valid.address));
        assert.notEqual(challenge.codeHash, p.code);
        assert.match(challenge.passwordHash, /^\$argon2id\$/);
        await post(c, 'login', { email: p.input.email, password: p.input.password }).expect(401);
        const verified = await post(c, 'verify-email', { challengeId: p.id, code: p.code }).expect(
          200,
        );
        assert.equal(verified.body.user.role, 'user');
        assert.equal(verified.body.user.member.access, null);
        assert.equal(verified.body.user.member.requestedMembership, 'annual');
        assert.equal(verified.body.user.member.bmi, 24.5);
        assert.equal(await models.Pending.findByPk(p.id), null);
        assert.ok(!JSON.stringify(verified.body).includes('passwordHash'));
        for (const cookie of verified.headers['set-cookie'].filter(
          (s) => s.startsWith('fd_access=') || s.startsWith('fd_refresh='),
        ))
          assert.ok(cookie.includes('HttpOnly') && cookie.includes('SameSite=Lax'));
        await c.agent.get('/api/v1/auth/me').expect(200);
        await post(c, 'verify-email', { challengeId: p.id, code: p.code }).expect(400);
        await post(c, 'logout', {}).expect(200);
        await c.agent.get('/api/v1/auth/me').expect(401);
      },
    );
    await t.test(
      'login verifies the real password and rejects unknown accounts and SQL payloads',
      async () => {
        const c = await client();
        const p = await register(c);
        const c2 = await client();
        await post(c2, 'login', { email: p.input.email, password: 'wrong password' }).expect(401);
        await post(c2, 'login', { email: p.input.email, password: p.input.password }).expect(200);
        await post(c2, 'login', { email: "' OR 1=1 --", password: 'irrelevant' }).expect(400);
        await post(c2, 'login', { email: 'missing@example.test', password: 'irrelevant' }).expect(
          401,
        );
      },
    );
    await t.test(
      'five wrong OTP attempts persist and resending cannot reset the budget',
      async () => {
        const c = await client();
        const p = await pending(c);
        const wrong = p.code === '000000' ? '111111' : '000000';
        for (let i = 0; i < 5; i++)
          await post(c, 'verify-email', { challengeId: p.id, code: wrong }).expect(400);
        assert.equal((await models.Pending.findByPk(p.id)).attempts, 5);
        await post(c, 'verify-email', { challengeId: p.id, code: p.code }).expect(400);
        await post(c, 'resend-code', { challengeId: p.id }).expect(400);
        assert.equal(await models.User.count({ where: { email: p.input.email } }), 0);
      },
    );
    await t.test(
      'expired OTPs and codes from a different browser cannot create accounts',
      async () => {
        const c = await client(),
          other = await client();
        const p = await pending(c);
        await post(other, 'verify-email', { challengeId: p.id, code: p.code }).expect(400);
        await models.Pending.update(
          { expiresAt: new Date(Date.now() - 1) },
          { where: { id: p.id } },
        );
        await post(c, 'verify-email', { challengeId: p.id, code: p.code }).expect(400);
      },
    );
    await t.test(
      'resend cooldown, code invalidation, and recipient send limit survive new requests',
      async () => {
        const c = await client();
        const p = await pending(c);
        await post(c, 'resend-code', { challengeId: p.id }).expect(429);
        await models.Pending.update(
          { sentAt: new Date(Date.now() - 61000) },
          { where: { id: p.id } },
        );
        await post(c, 'resend-code', { challengeId: p.id }).expect(200);
        let newCode = messages.get(p.id).code;
        if (newCode === p.code) {
          await models.Pending.update(
            { sentAt: new Date(Date.now() - 61000) },
            { where: { id: p.id } },
          );
          await post(c, 'resend-code', { challengeId: p.id }).expect(200);
          newCode = messages.get(p.id).code;
        }
        if (newCode !== p.code)
          await post(c, 'verify-email', { challengeId: p.id, code: p.code }).expect(400);
        await post(c, 'verify-email', { challengeId: p.id, code: newCode }).expect(200);
        const c2 = await client();
        const p2 = await pending(c2);
        for (let i = 0; i < 4; i++) {
          await models.Pending.update(
            { sentAt: new Date(Date.now() - 61000) },
            { where: { id: p2.id } },
          );
          await post(c2, 'resend-code', { challengeId: p2.id }).expect(200);
        }
        await models.Pending.update(
          { sentAt: new Date(Date.now() - 61000), expiresAt: new Date(Date.now() - 1) },
          { where: { id: p2.id } },
        );
        await post(c2, 'signup', p2.input).expect(429);
      },
    );
    await t.test(
      'public signup cannot overwrite a verified password or a pending browser signup',
      async () => {
        const first = await client();
        const p = await pending(first);
        const other = await client();
        const duplicate = await post(other, 'signup', {
          ...p.input,
          password: 'attacker passphrase',
        }).expect(202);
        assert.notEqual(duplicate.body.challengeId, p.id);
        await post(other, 'verify-email', { challengeId: p.id, code: p.code }).expect(400);
        await post(first, 'verify-email', { challengeId: p.id, code: p.code }).expect(200);
        await post(other, 'signup', { ...p.input, password: 'attacker passphrase' }).expect(202);
        await post(other, 'login', {
          email: p.input.email,
          password: 'attacker passphrase',
        }).expect(401);
        await post(other, 'login', { email: p.input.email, password: p.input.password }).expect(
          200,
        );
      },
    );
    await t.test('concurrent verification consumes one code and creates one user', async () => {
      const c = await client();
      const p = await pending(c);
      const results = await Promise.all([
        post(c, 'verify-email', { challengeId: p.id, code: p.code }),
        post(c, 'verify-email', { challengeId: p.id, code: p.code }),
      ]);
      assert.deepEqual(results.map((r) => r.status).sort(), [200, 400]);
      assert.equal(await models.User.count({ where: { email: p.input.email } }), 1);
    });
    await t.test(
      'profile ownership, server BMI, encrypted storage, and field allowlist',
      async () => {
        const first = await client(),
          second = await client();
        const a = await register(first),
          b = await register(second);
        const { email, password, membership, rateCategory, ...body } = a.input;
        await first.agent
          .put('/api/v1/me/profile')
          .set('Origin', env.FRONTEND_ORIGIN)
          .set('X-CSRF-Token', first.csrf)
          .send({ ...body, userId: b.user.id })
          .expect(400);
        const updated = await first.agent
          .put('/api/v1/me/profile')
          .set('Origin', env.FRONTEND_ORIGIN)
          .set('X-CSRF-Token', first.csrf)
          .send({ ...body, weight: 80 })
          .expect(200);
        assert.equal(updated.body.user.member.bmi, 26.1);
        assert.equal(
          (await second.agent.get('/api/v1/me').expect(200)).body.user.member.weight,
          75,
        );
        const profile = await models.Profile.findByPk(a.user.id);
        assert.ok(!profile.encryptedData.includes(valid.address));
        await request(app)
          .put('/api/v1/me/profile')
          .set('Origin', env.FRONTEND_ORIGIN)
          .send(body)
          .expect(403);
      },
    );
    await t.test('refresh rotates tokens and reuse revokes the session family', async () => {
      const c = await client();
      const p = await register(c);
      const old = p.response.headers['set-cookie']
        .find((s) => s.startsWith('fd_refresh='))
        .split(';')[0];
      await post(c, 'refresh', {}).expect(200);
      await request(app)
        .post('/api/v1/auth/refresh')
        .set('Origin', env.FRONTEND_ORIGIN)
        .set('X-CSRF-Token', c.csrf)
        .set('Cookie', [c.csrfCookie, old])
        .send({})
        .expect(401);
      await c.agent.get('/api/v1/auth/me').expect(401);
      await post(c, 'refresh', {}).expect(401);
    });
    await t.test('disabled accounts cannot login, refresh, or use a session', async () => {
      const c = await client();
      const p = await register(c);
      await models.User.update({ enabled: false }, { where: { id: p.user.id } });
      await c.agent.get('/api/v1/auth/me').expect(401);
      await post(c, 'refresh', {}).expect(401);
      await post(c, 'login', { email: p.input.email, password: p.input.password }).expect(401);
    });
    await t.test('recipient login failures throttle even across browser sessions', async () => {
      const c = await client();
      const p = await register(c);
      for (let i = 0; i < 5; i++) {
        const another = await client();
        await post(another, 'login', {
          email: p.input.email,
          password: 'incorrect passphrase',
        }).expect(401);
      }
      await post(c, 'login', { email: p.input.email, password: p.input.password }).expect(429);
    });
    await t.test('mail failure creates no account and preserves a resendable signup', async () => {
      const c = await client();
      failMail = true;
      const response = await post(c, 'signup', {
        ...valid,
        email: 'delivery-fail@example.test',
      }).expect(503);
      failMail = false;
      assert.ok(response.body.challengeId);
      assert.equal(await models.User.count({ where: { email: 'delivery-fail@example.test' } }), 0);
      await models.Pending.update(
        { sentAt: new Date(Date.now() - 61000) },
        { where: { id: response.body.challengeId } },
      );
      await post(c, 'resend-code', { challengeId: response.body.challengeId }).expect(200);
    });
    await t.test('HTTP security headers, no diagnostics, and signup IP rate limits', async () => {
      const limited = await createApp({ db, models, env, mail });
      const c = request.agent(limited);
      const boot = await c.get('/api/v1/auth/csrf').expect(200);
      assert.equal(boot.headers['x-content-type-options'], 'nosniff');
      assert.equal(boot.headers['x-powered-by'], undefined);
      assert.equal(boot.headers['cache-control'], 'no-store');
      for (let i = 0; i < 5; i++)
        await c
          .post('/api/v1/auth/signup')
          .set('Origin', env.FRONTEND_ORIGIN)
          .set('X-CSRF-Token', boot.body.csrfToken)
          .send({})
          .expect(400);
      const throttled = await c
        .post('/api/v1/auth/signup')
        .set('X-Forwarded-For', '192.0.2.33')
        .set('Origin', env.FRONTEND_ORIGIN)
        .set('X-CSRF-Token', boot.body.csrfToken)
        .send({})
        .expect(429);
      assert.ok(throttled.headers['retry-after']);
      const unknown = await c.get('/api/v1/does-not-exist').expect(404);
      assert.ok(!JSON.stringify(unknown.body).includes('stack'));
    });
  } finally {
    await db.close();
  }
});
