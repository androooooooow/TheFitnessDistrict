import { randomUUID } from 'node:crypto';
import { Op } from 'sequelize';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError.js';
import { decrypt, digest, hmac } from '../utils/security.js';
import { bmi } from '../validators/auth.schema.js';
import { auditService } from './audit.service.js';

export const gymDate = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
export function membershipEnd(start, months) {
  const [y, m, d] = start.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
}
const plans = {
  monthly: [1, 1500, 2000],
  quarterly: [3, 3500, 5000],
  'half-year': [6, 6500, 9500],
  annual: [12, 11000, 18000],
};
const accessView = (a) =>
  a && {
    id: a.id,
    planId: a.plan_id,
    rateCategory: a.rate_category,
    listedRate: a.listed_rate,
    timeSlot: a.time_slot,
    start: a.start_date,
    end: a.end_date,
    sessions: a.sessions,
    totalSessions: a.total_sessions,
    status: a.status,
  };
const visitView = (v) => ({
  id: v.id,
  memberId: v.member_id,
  accessId: v.access_id,
  in: v.time_in,
  out: v.time_out,
  source: v.source,
});
export function gymService({ db, models, env, progress }) {
  const audit = auditService(models);
  const qrKey = hmac(env.CODE_SECRET, 'gym-attendance-qr-v1');
  const rows = async (sql, bind = [], transaction) =>
    (await db.query(sql, { bind, transaction }))[0];
  async function lockMember(id, transaction) {
    const user = await models.User.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!user || user.role !== 'user' || !(await models.Profile.findByPk(id, { transaction })))
      throw new AppError(404, 'Member not found.');
    return user;
  }
  async function repeat(actor, input, fingerprint, transaction) {
    const prior = (
      await rows(
        'SELECT fingerprint,result FROM gym_requests WHERE actor_id=$1 AND request_id=$2',
        [actor.id, input.requestId],
        transaction,
      )
    )[0];
    if (!prior) return null;
    if (prior.fingerprint !== fingerprint)
      throw new AppError(409, 'This request was already used for a different action.');
    return prior.result;
  }
  async function remember(actor, input, fingerprint, result, transaction) {
    await rows(
      'INSERT INTO gym_requests(actor_id,request_id,fingerprint,result) VALUES($1,$2,$3,$4::jsonb) RETURNING request_id',
      [actor.id, input.requestId, fingerprint, JSON.stringify(result)],
      transaction,
    );
    return result;
  }
  async function members(actor) {
    const users = await models.User.findAll({
      where: actor.role === 'admin' ? { role: 'user' } : { id: actor.id },
      order: [['createdAt', 'DESC']],
      limit: 1000,
    });
    const ids = users.map((u) => u.id);
    if (!ids.length) return [];
    const profiles = await models.Profile.findAll({ where: { userId: { [Op.in]: ids } } });
    const accesses = await rows(
      'SELECT * FROM member_accesses WHERE member_id=ANY($1::uuid[]) ORDER BY created_at DESC,id DESC',
      [ids],
    );
    return users.flatMap((u) => {
      const p = profiles.find((p) => p.userId === u.id);
      if (!p) return [];
      const data = decrypt(p.encryptedData, env.FIELD_ENCRYPTION_KEY);
      const history = accesses.filter((a) => a.member_id === u.id);
      return [
        {
          id: u.id,
          code: p.code,
          email: u.email,
          ...data,
          name: data.fullName,
          bmi: bmi(data.weight, data.height),
          joined: gymDate(u.createdAt),
          status: u.enabled ? 'enabled' : 'disabled',
          color: 0,
          requestedMembership: p.requestedMembership,
          rateCategory: p.rateCategory,
          profileVersion: p.version,
          access: accessView(history.find((a) => a.status !== 'replaced')) || null,
          history: history.filter((a) => a.status === 'replaced').map(accessView),
        },
      ];
    });
  }
  async function validQr(token, transaction) {
    let claims;
    try {
      claims = jwt.verify(token, qrKey, {
        algorithms: ['HS256'],
        issuer: 'fit-district',
        audience: 'fit-district-attendance',
        maxAge: '90s',
      });
    } catch {
      throw new AppError(
        400,
        'The gym QR is invalid or expired. Scan the current QR on the admin’s screen.',
      );
    }
    if (
      claims.purpose !== 'attendance' ||
      typeof claims.sid !== 'string' ||
      typeof claims.sub !== 'string'
    )
      throw new AppError(400, 'Invalid gym QR.');
    const session = await models.Session.findByPk(claims.sid, { transaction });
    const admin = session && (await models.User.findByPk(session.userId, { transaction }));
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      !admin?.enabled ||
      admin.role !== 'admin' ||
      admin.id !== claims.sub
    )
      throw new AppError(400, 'This gym QR is no longer active. Ask the admin to refresh it.');
  }
  return {
    async state(actor) {
      const memberList = await members(actor);
      const where = actor.role === 'admin' ? '' : 'WHERE member_id=$1';
      const bind = actor.role === 'admin' ? [] : [actor.id];
      const visits = await rows(
        `SELECT * FROM attendance_visits ${where} ORDER BY time_in DESC LIMIT 1000`,
        bind,
      );
      return {
        version: 1,
        members: memberList,
        visits: visits.map(visitView),
        ...(await progress.snapshot(
          actor,
          memberList.map((m) => m.id),
        )),
        settings: { name: 'The Fit District', email: '', phone: '' },
        limited: memberList.length === 1000 || visits.length === 1000,
      };
    },
    qr(auth) {
      const token = jwt.sign({ purpose: 'attendance', sid: auth.session.id }, qrKey, {
        algorithm: 'HS256',
        subject: auth.user.id,
        issuer: 'fit-district',
        audience: 'fit-district-attendance',
        jwtid: randomUUID(),
        expiresIn: 90,
      });
      return { token, expiresAt: new Date(jwt.decode(token).exp * 1000).toISOString() };
    },
    async activate(actor, id, input) {
      const fingerprint = digest(
        JSON.stringify([
          'access',
          id,
          input.planId,
          input.rateCategory,
          input.planId === 'day' ? input.timeSlot : null,
        ]),
      );
      return db.transaction(async (transaction) => {
        // Serialize all idempotent actions by actor, then membership/visit changes by member.
        await rows(
          'SELECT pg_advisory_xact_lock(hashtextextended($1,0))',
          [`gym:${actor.id}`],
          transaction,
        );
        const prior = await repeat(actor, input, fingerprint, transaction);
        if (prior) return prior;
        const member = await lockMember(id, transaction);
        if (!member.enabled) throw new AppError(409, 'This member account is disabled.');
        const start = gymDate();
        const daily = input.planId === 'day';
        const rate = daily
          ? (input.timeSlot === 'morning' ? 100 : 150) + (input.rateCategory === 'student' ? 0 : 50)
          : plans[input.planId][input.rateCategory === 'student' ? 1 : 2];
        const end = daily
          ? gymDate(new Date(`${start}T00:00:00+08:00`).getTime() + 86400000)
          : membershipEnd(start, plans[input.planId][0]);
        await rows(
          "UPDATE member_accesses SET status='replaced' WHERE member_id=$1 AND status IN ('active','suspended') RETURNING id",
          [id],
          transaction,
        );
        const access = (
          await rows(
            "INSERT INTO member_accesses(id,member_id,plan_id,rate_category,listed_rate,time_slot,start_date,end_date,sessions,total_sessions,status,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$9,'active',$10) RETURNING *",
            [
              randomUUID(),
              id,
              input.planId,
              input.rateCategory,
              rate,
              daily ? input.timeSlot : null,
              start,
              end,
              daily ? 1 : null,
              actor.id,
            ],
            transaction,
          )
        )[0];
        await audit(
          actor,
          'membership.activate',
          'member',
          id,
          {
            accessId: access.id,
            planId: input.planId,
            rateCategory: input.rateCategory,
            listedRate: rate,
            paymentConfirmed: true,
          },
          transaction,
        );
        return remember(
          actor,
          input,
          fingerprint,
          {
            access: accessView(access),
            message: 'Membership activated after counter payment confirmation.',
          },
          transaction,
        );
      });
    },
    async status(actor, id, input) {
      return db.transaction(async (transaction) => {
        await lockMember(id, transaction);
        const current = (
          await rows(
            "SELECT * FROM member_accesses WHERE member_id=$1 AND status IN ('active','suspended')",
            [id],
            transaction,
          )
        )[0];
        if (!current) throw new AppError(409, 'Activate a membership first.');
        if (current.status !== input.status) {
          await rows(
            'UPDATE member_accesses SET status=$2 WHERE id=$1 RETURNING id',
            [current.id, input.status],
            transaction,
          );
          await audit(
            actor,
            'membership.status',
            'member',
            id,
            { accessId: current.id, from: current.status, to: input.status },
            transaction,
          );
        }
        return {
          message: input.status === 'active' ? 'Membership resumed.' : 'Membership suspended.',
        };
      });
    },
    async scan(actor, input) {
      const fingerprint = digest(JSON.stringify(['scan', input.action, input.token]));
      return db.transaction(async (transaction) => {
        await rows(
          'SELECT pg_advisory_xact_lock(hashtextextended($1,0))',
          [`gym:${actor.id}`],
          transaction,
        );
        const prior = await repeat(actor, input, fingerprint, transaction);
        if (prior) return prior;
        const member = await lockMember(actor.id, transaction);
        if (!member.enabled) throw new AppError(401, 'Please sign in.');
        await validQr(input.token, transaction);
        const now = new Date();
        const open = (
          await rows(
            'SELECT * FROM attendance_visits WHERE member_id=$1 AND time_out IS NULL',
            [actor.id],
            transaction,
          )
        )[0];
        let visit;
        if (input.action === 'time-in') {
          if (open) throw new AppError(409, 'You are already timed in. Scan again to time out.');
          const access = (
            await rows(
              "SELECT * FROM member_accesses WHERE member_id=$1 AND status='active'",
              [actor.id],
              transaction,
            )
          )[0];
          const today = gymDate(now);
          if (
            !access ||
            today < access.start_date ||
            today >= access.end_date ||
            (access.sessions !== null && access.sessions <= 0)
          )
            throw new AppError(
              403,
              'You need an active membership or an unused daily pass. Please visit the counter.',
            );
          if (access.time_slot) {
            const hour = Number(
              new Intl.DateTimeFormat('en-GB', {
                timeZone: 'Asia/Manila',
                hour: '2-digit',
                hourCycle: 'h23',
              }).format(now),
            );
            if (access.time_slot === 'morning' ? hour < 7 || hour >= 12 : hour < 12)
              throw new AppError(
                403,
                'Your daily pass does not cover this entry time. Please visit the counter.',
              );
          }
          visit = (
            await rows(
              'INSERT INTO attendance_visits(id,member_id,access_id,time_in) VALUES($1,$2,$3,$4) RETURNING *',
              [randomUUID(), actor.id, access.id, now],
              transaction,
            )
          )[0];
          if (access.sessions !== null)
            await rows(
              'UPDATE member_accesses SET sessions=sessions-1 WHERE id=$1 RETURNING id',
              [access.id],
              transaction,
            );
        } else {
          if (!open) throw new AppError(409, 'You have no open visit to time out.');
          visit = (
            await rows(
              'UPDATE attendance_visits SET time_out=$2 WHERE id=$1 RETURNING *',
              [open.id, now],
              transaction,
            )
          )[0];
        }
        await audit(
          actor,
          input.action === 'time-in' ? 'attendance.time_in' : 'attendance.time_out',
          'visit',
          visit.id,
          { memberId: actor.id, accessId: visit.access_id, source: 'qr' },
          transaction,
        );
        return remember(
          actor,
          input,
          fingerprint,
          {
            visit: visitView(visit),
            message:
              input.action === 'time-in'
                ? 'Time-in saved. Enjoy your workout!'
                : 'Time-out saved. See you next time!',
          },
          transaction,
        );
      });
    },
    async attendance(actor, input) {
      const clauses = [];
      const bind = [];
      const value = (v) => {
        bind.push(v);
        return `$${bind.length}`;
      };
      if (actor.role !== 'admin') clauses.push(`member_id=${value(actor.id)}`);
      if (input.scope === 'inside') clauses.push('time_out IS NULL');
      if (input.scope === 'today') {
        const day = input.date || gymDate();
        const start = new Date(`${day}T00:00:00+08:00`);
        clauses.push(
          `time_in>=${value(start)} AND time_in<${value(new Date(start.getTime() + 86400000))}`,
        );
      }
      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      const count = (
        await rows(`SELECT count(*)::int AS total FROM attendance_visits ${where}`, bind)
      )[0].total;
      const visits = await rows(
        `SELECT * FROM attendance_visits ${where} ORDER BY time_in DESC,id DESC LIMIT ${value(input.limit)} OFFSET ${value(input.offset)}`,
        bind,
      );
      const memberList = await membersForVisits(visits);
      const own = actor.role === 'admin' ? '' : 'WHERE member_id=$1';
      const stats = (
        await rows(
          `SELECT count(*) FILTER (WHERE time_out IS NULL)::int AS inside, count(*) FILTER (WHERE (time_in AT TIME ZONE 'Asia/Manila')::date=(now() AT TIME ZONE 'Asia/Manila')::date)::int AS arrivals, count(*) FILTER (WHERE (time_out AT TIME ZONE 'Asia/Manila')::date=(now() AT TIME ZONE 'Asia/Manila')::date)::int AS departures FROM attendance_visits ${own}`,
          actor.role === 'admin' ? [] : [actor.id],
        )
      )[0];
      return {
        visits: visits.map((v) => ({
          ...visitView(v),
          member: memberList.find((m) => m.id === v.member_id),
        })),
        total: count,
        stats,
      };
    },
    async audit(input) {
      const clauses = [];
      const bind = [];
      const value = (v) => {
        bind.push(v);
        return `$${bind.length}`;
      };
      if (input.action) clauses.push(`action=${value(input.action)}`);
      if (input.date) {
        const start = new Date(`${input.date}T00:00:00+08:00`);
        clauses.push(
          `occurred_at>=${value(start)} AND occurred_at<${value(new Date(start.getTime() + 86400000))}`,
        );
      }
      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      const total = (await rows(`SELECT count(*)::int AS total FROM audit_logs ${where}`, bind))[0]
        .total;
      const entries = await rows(
        `SELECT * FROM audit_logs ${where} ORDER BY occurred_at DESC,id DESC LIMIT ${value(input.limit)} OFFSET ${value(input.offset)}`,
        bind,
      );
      const actors = await membersForVisits(entries.map((e) => ({ member_id: e.actor_id })));
      return {
        total,
        entries: entries.map((e) => ({
          id: e.id,
          actorId: e.actor_id,
          actor:
            actors.find((a) => a.id === e.actor_id)?.name ||
            (e.actor_role === 'admin' ? 'Administrator' : 'Member'),
          actorRole: e.actor_role,
          action: e.action,
          entityType: e.entity_type,
          entityId: e.entity_id,
          details: e.details,
          occurredAt: e.occurred_at,
        })),
      };
    },
  };
  async function membersForVisits(visits) {
    const ids = [...new Set(visits.map((v) => v.member_id).filter(Boolean))];
    if (!ids.length) return [];
    const profiles = await models.Profile.findAll({ where: { userId: { [Op.in]: ids } } });
    return profiles.map((p) => ({
      id: p.userId,
      name: decrypt(p.encryptedData, env.FIELD_ENCRYPTION_KEY).fullName,
      code: p.code,
      color: 0,
    }));
  }
}
