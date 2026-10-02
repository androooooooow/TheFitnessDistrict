import { randomUUID } from 'node:crypto';
import { Op } from 'sequelize';
import { AppError } from '../utils/AppError.js';
import { encrypt, decrypt, hmac } from '../utils/security.js';
import { today } from '../validators/auth.schema.js';
import { auditService } from './audit.service.js';
const order = [
  ['date', 'DESC'],
  ['sortOrder', 'DESC'],
];
export function progressService({ db, models, env }) {
  const { User, Profile, Progress, Goal } = models;
  const audit = auditService(models);
  const seal = (data, purpose) => encrypt(data, env.FIELD_ENCRYPTION_KEY, purpose);
  const open = (data, purpose) => decrypt(data, env.FIELD_ENCRYPTION_KEY, purpose);
  const entryView = (p) => ({
    id: p.id,
    memberId: p.memberId,
    metric: p.metric,
    date: p.date,
    ...open(p.encryptedData, 'progress'),
    unit: p.metric === 'Waist' ? 'cm' : 'kg',
    author: p.authorRole === 'admin' ? 'admin' : p.createdBy,
    authorId: p.createdBy,
    source: p.source,
    version: p.version,
  });
  const goalView = (g) => ({
    id: g.id,
    memberId: g.memberId,
    metric: g.metric,
    ...open(g.encryptedData, 'goal'),
    unit: g.metric === 'Waist' ? 'cm' : 'kg',
    version: g.version,
  });
  async function member(actor, id, transaction, lock = false) {
    if (actor.role !== 'admin' && id !== actor.id) throw new AppError(404, 'Member not found.');
    const user = await User.findByPk(id, {
      transaction,
      ...(lock ? { lock: transaction.LOCK.UPDATE } : {}),
    });
    if (!user || user.role !== 'user' || !(await Profile.findByPk(id, { transaction })))
      throw new AppError(404, 'Member not found.');
    return user;
  }
  async function idempotent(actor, input, fingerprint, transaction, work) {
    await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', {
      bind: [`gym:${actor.id}`],
      transaction,
    });
    const [prior] = await db.query(
      'SELECT fingerprint,result FROM gym_requests WHERE actor_id=$1 AND request_id=$2',
      { bind: [actor.id, input.requestId], transaction },
    );
    if (prior.length) {
      if (prior[0].fingerprint !== fingerprint)
        throw new AppError(409, 'This request was used for a different action.');
      return prior[0].result;
    }
    const result = await work();
    await db.query(
      'INSERT INTO gym_requests(actor_id,request_id,fingerprint,result) VALUES($1,$2,$3,$4::jsonb)',
      { bind: [actor.id, input.requestId, fingerprint, JSON.stringify(result)], transaction },
    );
    return result;
  }
  async function record(
    actor,
    memberId,
    { metric, value, date, notes },
    transaction,
    source = 'journal',
  ) {
    const entry = await Progress.create(
      {
        id: randomUUID(),
        memberId,
        metric,
        date,
        encryptedData: seal({ value, notes }, 'progress'),
        source,
        createdBy: actor.id,
        authorRole: actor.role,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      { transaction },
    );
    await audit(
      actor,
      'progress.recorded',
      'progress',
      entry.id,
      { memberId, metric, source },
      transaction,
    );
    return entry;
  }
  async function syncWeight(memberId, transaction) {
    const latest = await Progress.findOne({
      where: { memberId, metric: 'Weight' },
      order,
      transaction,
    });
    if (!latest) return;
    const profile = await Profile.findByPk(memberId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const data = decrypt(profile.encryptedData, env.FIELD_ENCRYPTION_KEY);
    const weight = open(latest.encryptedData, 'progress').value;
    if (data.weight !== weight) {
      profile.encryptedData = encrypt({ ...data, weight }, env.FIELD_ENCRYPTION_KEY);
      profile.version++;
      await profile.save({ transaction });
    }
  }
  return {
    record,
    async snapshot(actor, memberIds) {
      const where =
        actor.role === 'admin' ? { memberId: { [Op.in]: memberIds } } : { memberId: actor.id };
      const entries = await Progress.findAll({ where, order, limit: 1000 });
      const goals = await Goal.findAll({ where, limit: 3000 });
      return { progress: entries.reverse().map(entryView), goals: goals.map(goalView) };
    },
    async list(actor, input) {
      const id = actor.role === 'user' ? actor.id : input.memberId;
      if (!id) throw new AppError(400, 'Choose a member to view progress.');
      if (actor.role === 'user' && input.memberId && input.memberId !== actor.id)
        throw new AppError(404, 'Member not found.');
      await member(actor, id);
      const where = { memberId: id };
      const metricWhere = { ...where, metric: input.metric };
      const [entries, total, chart, count, first, latest, goals] = await Promise.all([
        Progress.findAll({ where, order, limit: input.limit, offset: input.offset }),
        Progress.count({ where }),
        Progress.findAll({ where: metricWhere, order, limit: 200 }),
        Progress.count({ where: metricWhere }),
        Progress.findOne({
          where: metricWhere,
          order: [
            ['date', 'ASC'],
            ['sortOrder', 'ASC'],
          ],
        }),
        Progress.findOne({ where: metricWhere, order }),
        Goal.findAll({ where }),
      ]);
      return {
        entries: entries.map(entryView),
        total,
        chart: chart.reverse().map(entryView),
        chartLimited: count > 200,
        summary: {
          count,
          first: first ? entryView(first) : null,
          latest: latest ? entryView(latest) : null,
        },
        goals: goals.map(goalView),
      };
    },
    async create(actor, input) {
      const fingerprint = hmac(
        env.CODE_SECRET,
        JSON.stringify([
          'progress',
          input.memberId,
          input.metric,
          input.value,
          input.date,
          input.notes,
        ]),
      );
      return db.transaction((transaction) =>
        idempotent(actor, input, fingerprint, transaction, async () => {
          await member(actor, input.memberId, transaction, true);
          const entry = await record(actor, input.memberId, input, transaction);
          if (input.metric === 'Weight') await syncWeight(input.memberId, transaction);
          return { id: entry.id, message: 'Progress saved.' };
        }),
      );
    },
    async edit(actor, id, input) {
      return db.transaction(async (transaction) => {
        const peek = await Progress.findByPk(id, { transaction });
        if (
          !peek ||
          (actor.role !== 'admin' &&
            (peek.memberId !== actor.id ||
              peek.createdBy !== actor.id ||
              peek.authorRole !== 'user'))
        )
          throw new AppError(404, 'Editable entry not found.');
        await member(actor, peek.memberId, transaction, true);
        const entry = await Progress.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
        if (entry.version !== input.version)
          throw new AppError(
            409,
            'This measurement changed. Reload the journal before editing it again.',
          );
        const oldMetric = entry.metric;
        entry.metric = input.metric;
        entry.date = input.date;
        entry.encryptedData = seal({ value: input.value, notes: input.notes }, 'progress');
        entry.version++;
        entry.updatedAt = new Date();
        await entry.save({ transaction });
        if (oldMetric === 'Weight' || input.metric === 'Weight')
          await syncWeight(entry.memberId, transaction);
        await audit(
          actor,
          'progress.updated',
          'progress',
          id,
          { memberId: entry.memberId, metric: entry.metric },
          transaction,
        );
        return { id, message: 'Progress updated.' };
      });
    },
    async goal(actor, input) {
      const fingerprint = hmac(
        env.CODE_SECRET,
        JSON.stringify(['goal', input.memberId, input.metric, input.target, input.version || null]),
      );
      return db.transaction((transaction) =>
        idempotent(actor, input, fingerprint, transaction, async () => {
          await member(actor, input.memberId, transaction, true);
          let goal = await Goal.findOne({
            where: { memberId: input.memberId, metric: input.metric },
            transaction,
            lock: transaction.LOCK.UPDATE,
          });
          if (goal && input.version && goal.version !== input.version)
            throw new AppError(409, 'This goal changed. Reload progress and try again.');
          if (goal && open(goal.encryptedData, 'goal').target === input.target)
            return { id: goal.id, message: 'Goal is already saved.' };
          if (goal && !input.version)
            throw new AppError(
              409,
              'This metric already has a goal. Reload progress to update it.',
            );
          const latest = await Progress.findOne({
            where: { memberId: input.memberId, metric: input.metric },
            order,
            transaction,
          });
          const data = {
            target: input.target,
            baseline: latest ? open(latest.encryptedData, 'progress').value : null,
          };
          if (goal) {
            goal.encryptedData = seal(data, 'goal');
            goal.updatedBy = actor.id;
            goal.version++;
            goal.updatedAt = new Date();
            await goal.save({ transaction });
          } else
            goal = await Goal.create(
              {
                id: randomUUID(),
                memberId: input.memberId,
                metric: input.metric,
                encryptedData: seal(data, 'goal'),
                updatedBy: actor.id,
                updatedAt: new Date(),
                version: 1,
              },
              { transaction },
            );
          await audit(
            actor,
            'goal.updated',
            'goal',
            goal.id,
            { memberId: input.memberId, metric: input.metric },
            transaction,
          );
          return { id: goal.id, message: 'Goal saved.' };
        }),
      );
    },
    async profileWeight(actor, profile, values, transaction) {
      const previous = decrypt(profile.encryptedData, env.FIELD_ENCRYPTION_KEY);
      if (previous.weight !== values.weight)
        await record(
          actor,
          actor.id,
          {
            metric: 'Weight',
            value: values.weight,
            date: today(),
            notes: 'Weight updated from profile.',
          },
          transaction,
          'profile',
        );
    },
  };
}
