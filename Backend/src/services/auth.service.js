import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import {
  opaque,
  digest,
  equal,
  makeCode,
  codeHash,
  hashPassword,
  verifyPassword,
  encrypt,
  decrypt,
} from '../utils/security.js';
import { counterService } from './counter.service.js';
import { AppError } from '../utils/AppError.js';
import { bmi } from '../validators/auth.schema.js';

export async function authService({ db, models, env, mail }) {
  const { User, Profile, Pending, Session, Refresh } = models;
  const counters = counterService(models, env.CODE_SECRET);
  const dummyHash = await hashPassword(opaque());
  const badCode = () =>
    new AppError(
      400,
      'The code or signup request is invalid or expired. Request another code if needed.',
    );
  const badLogin = () => new AppError(401, 'Email or password is incorrect.');
  const lockEmail = (email, transaction) =>
    db.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', {
      bind: [`auth:${email}`],
      transaction,
    });
  function serialize(user, profile) {
    if (!profile) return { id: user.id, email: user.email, role: user.role, member: null };
    const data = decrypt(profile.encryptedData, env.FIELD_ENCRYPTION_KEY);
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      member: {
        id: user.id,
        code: profile.code,
        name: data.fullName,
        email: user.email,
        ...data,
        bmi: bmi(data.weight, data.height),
        joined: new Date(user.createdAt).toISOString().slice(0, 10),
        status: 'enabled',
        access: null,
        history: [],
        color: 0,
        requestedMembership: profile.requestedMembership,
        rateCategory: profile.rateCategory,
      },
    };
  }
  async function sessionFor(user, csrf, transaction) {
    const id = randomUUID();
    const refresh = opaque();
    const expiresAt = new Date(Date.now() + 7 * 86400000);
    await Session.create(
      { id, userId: user.id, csrfHash: digest(csrf), expiresAt, createdAt: new Date() },
      { transaction },
    );
    await Refresh.create({ hash: digest(refresh), sessionId: id }, { transaction });
    const access = jwt.sign({ sid: id }, env.JWT_SECRET, {
      algorithm: 'HS256',
      subject: user.id,
      issuer: 'fit-district',
      audience: 'fit-district-web',
      expiresIn: '15m',
    });
    return { access, refresh, expiresAt };
  }
  async function deliver(result) {
    if (result.error) {
      if (result.challengeId) result.error.challengeId = result.challengeId;
      throw result.error;
    }
    if (result.email) {
      try {
        await mail.sendCode({
          email: result.email,
          code: result.code,
          challengeId: result.challengeId,
        });
      } catch {
        const error = new AppError(
          503,
          'We could not send the verification email. Check the address and try resending after 60 seconds.',
        );
        error.challengeId = result.challengeId;
        throw error;
      }
    }
    return {
      challengeId: result.challengeId,
      resendAfter: 60,
      expiresIn: 600,
      message: 'If this email can be registered, a verification code has been sent.',
    };
  }
  async function prepareChallenge(input, flow, csrf) {
    const passwordHash = await hashPassword(input.password);
    const { password, email, ...data } = input;
    return db.transaction(async (transaction) => {
      await lockEmail(email, transaction);
      if (await User.findOne({ where: { email }, transaction }))
        return { challengeId: randomUUID() };
      const old = await Pending.findOne({
        where: { email },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (old && old.expiresAt > new Date()) {
        if (!equal(old.flowHash, digest(flow)) || !equal(old.csrfHash, digest(csrf)))
          return { challengeId: randomUUID() };
        return {
          error: new AppError(
            429,
            'A code was already requested. Use the verification screen to resend.',
            undefined,
            Math.max(1, Math.ceil((old.sentAt.getTime() + 60000 - Date.now()) / 1000)),
          ),
          challengeId: old.id,
        };
      }
      const limited = await counters.consume('send', email, 5, 3600, transaction);
      if (limited) return { error: limited };
      if (old) await old.destroy({ transaction });
      const challengeId = randomUUID();
      const code = makeCode();
      await Pending.create(
        {
          id: challengeId,
          email,
          flowHash: digest(flow),
          csrfHash: digest(csrf),
          passwordHash,
          encryptedData: encrypt(data, env.FIELD_ENCRYPTION_KEY),
          codeHash: codeHash(env.CODE_SECRET, challengeId, code),
          expiresAt: new Date(Date.now() + 600000),
          sentAt: new Date(),
          createdAt: new Date(),
          attempts: 0,
        },
        { transaction },
      );
      return { challengeId, email, code };
    });
  }
  return {
    signup: async (input, flow, csrf) => deliver(await prepareChallenge(input, flow, csrf)),
    async resend(challengeId, flow, csrf) {
      const result = await db.transaction(async (transaction) => {
        const peek = await Pending.findByPk(challengeId, { transaction });
        if (!peek) return { error: badCode() };
        await lockEmail(peek.email, transaction);
        const challenge = await Pending.findByPk(challengeId, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (
          !challenge ||
          !equal(challenge.flowHash, digest(flow)) ||
          !equal(challenge.csrfHash, digest(csrf)) ||
          challenge.attempts >= 5
        )
          return { error: badCode() };
        const retry = Math.ceil((challenge.sentAt.getTime() + 60000 - Date.now()) / 1000);
        if (retry > 0)
          return {
            error: new AppError(429, 'Wait before requesting another code.', undefined, retry),
          };
        const limited = await counters.consume('send', challenge.email, 5, 3600, transaction);
        if (limited) return { error: limited };
        let code;
        do {
          code = makeCode();
        } while (equal(challenge.codeHash, codeHash(env.CODE_SECRET, challenge.id, code)));
        challenge.codeHash = codeHash(env.CODE_SECRET, challenge.id, code);
        challenge.sentAt = new Date();
        challenge.expiresAt = new Date(Date.now() + 600000);
        await challenge.save({ transaction });
        return { challengeId: challenge.id, email: challenge.email, code };
      });
      return deliver(result);
    },
    async verify(challengeId, code, flow, csrf) {
      const result = await db.transaction(async (transaction) => {
        const peek = await Pending.findByPk(challengeId, { transaction });
        if (!peek) return { error: badCode() };
        await lockEmail(peek.email, transaction);
        const challenge = await Pending.findByPk(challengeId, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (
          !challenge ||
          !equal(challenge.flowHash, digest(flow)) ||
          !equal(challenge.csrfHash, digest(csrf)) ||
          challenge.expiresAt <= new Date() ||
          challenge.attempts >= 5
        )
          return { error: badCode() };
        const limited = await counters.check('verify', challenge.email, 10, 900, transaction);
        if (limited) return { error: limited };
        if (!equal(challenge.codeHash, codeHash(env.CODE_SECRET, challenge.id, code))) {
          challenge.attempts += 1;
          await challenge.save({ transaction });
          await counters.consume('verify', challenge.email, 10, 900, transaction);
          return { error: badCode() };
        }
        if (await User.findOne({ where: { email: challenge.email }, transaction }))
          return { error: badCode() };
        const id = randomUUID();
        const data = decrypt(challenge.encryptedData, env.FIELD_ENCRYPTION_KEY);
        const { membership, rateCategory, ...profileData } = data;
        const user = await User.create(
          {
            id,
            email: challenge.email,
            passwordHash: challenge.passwordHash,
            role: 'user',
            enabled: true,
            emailVerifiedAt: new Date(),
            createdAt: new Date(),
          },
          { transaction },
        );
        const profile = await Profile.create(
          {
            userId: id,
            code: `FD-${id.replaceAll('-', '').slice(0, 16).toUpperCase()}`,
            encryptedData: encrypt(profileData, env.FIELD_ENCRYPTION_KEY),
            requestedMembership: membership,
            rateCategory,
          },
          { transaction },
        );
        const tokens = await sessionFor(user, csrf, transaction);
        await challenge.destroy({ transaction });
        return { user: serialize(user, profile), tokens };
      });
      if (result.error) throw result.error;
      return result;
    },
    async login(email, password, csrf) {
      const result = await db.transaction(async (transaction) => {
        await lockEmail(email, transaction);
        const limited = await counters.check('login', email, 5, 900, transaction);
        if (limited) return { error: limited };
        const user = await User.findOne({
          where: { email },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        const matches = await verifyPassword(user?.passwordHash || dummyHash, password);
        if (!matches || !user?.enabled) {
          await counters.consume('login', email, 5, 900, transaction);
          return { error: badLogin() };
        }
        const profile = await Profile.findByPk(user.id, { transaction });
        if (!profile && user.role !== 'admin') return { error: badLogin() };
        await counters.reset('login', email, transaction);
        return {
          user: serialize(user, profile),
          tokens: await sessionFor(user, csrf, transaction),
        };
      });
      if (result.error) throw result.error;
      return result;
    },
    async authenticate(token) {
      let claims;
      try {
        claims = jwt.verify(token, env.JWT_SECRET, {
          algorithms: ['HS256'],
          issuer: 'fit-district',
          audience: 'fit-district-web',
        });
      } catch {
        throw new AppError(401, 'Please sign in.');
      }
      const session = typeof claims.sid === 'string' ? await Session.findByPk(claims.sid) : null;
      if (
        !session ||
        session.revokedAt ||
        session.expiresAt <= new Date() ||
        session.userId !== claims.sub
      )
        throw new AppError(401, 'Please sign in.');
      const user = await User.findByPk(session.userId);
      if (!user?.enabled || !user.emailVerifiedAt) throw new AppError(401, 'Please sign in.');
      return { user, session };
    },
    async me(user) {
      const profile = await Profile.findByPk(user.id);
      if (!profile && user.role !== 'admin') throw new AppError(404, 'Profile unavailable.');
      return serialize(user, profile);
    },
    async updateProfile(user, input) {
      return db.transaction(async (transaction) => {
        const current = await User.findByPk(user.id, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (!current?.enabled) throw new AppError(401, 'Please sign in.');
        const profile = await Profile.findByPk(user.id, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        profile.encryptedData = encrypt(input, env.FIELD_ENCRYPTION_KEY);
        await profile.save({ transaction });
        return serialize(current, profile);
      });
    },
    async refresh(token, csrf) {
      const result = await db.transaction(async (transaction) => {
        const peek = await Refresh.findByPk(digest(token), { transaction });
        if (!peek) return { error: new AppError(401, 'Please sign in again.') };
        const session = await Session.findByPk(peek.sessionId, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (
          !session ||
          !equal(session.csrfHash, digest(csrf)) ||
          session.revokedAt ||
          session.expiresAt <= new Date()
        )
          return { error: new AppError(401, 'Please sign in again.') };
        const refresh = await Refresh.findByPk(digest(token), {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (refresh.consumedAt) {
          session.revokedAt = new Date();
          await session.save({ transaction });
          return { error: new AppError(401, 'Please sign in again.') };
        }
        const user = await User.findByPk(session.userId, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (!user?.enabled) return { error: new AppError(401, 'Please sign in again.') };
        refresh.consumedAt = new Date();
        await refresh.save({ transaction });
        const next = opaque();
        await Refresh.create({ hash: digest(next), sessionId: session.id }, { transaction });
        const access = jwt.sign({ sid: session.id }, env.JWT_SECRET, {
          algorithm: 'HS256',
          subject: user.id,
          issuer: 'fit-district',
          audience: 'fit-district-web',
          expiresIn: '15m',
        });
        return { tokens: { access, refresh: next, expiresAt: session.expiresAt } };
      });
      if (result.error) throw result.error;
      return result;
    },
    async logout(token, csrf) {
      if (!token) return;
      await db.transaction(async (transaction) => {
        const refresh = await Refresh.findByPk(digest(token), { transaction });
        if (!refresh) return;
        const session = await Session.findByPk(refresh.sessionId, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (session && equal(session.csrfHash, digest(csrf))) {
          session.revokedAt = new Date();
          await session.save({ transaction });
        }
      });
    },
  };
}
