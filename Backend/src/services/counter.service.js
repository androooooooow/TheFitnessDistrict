import { hmac } from '../utils/security.js';
import { AppError } from '../utils/AppError.js';
export function counterService(models, secret) {
  const keyFor = (scope, email) => hmac(secret, `${scope}:${email}`);
  async function row(scope, email, seconds, transaction) {
    const key = keyFor(scope, email);
    await models.Counter.findOrCreate({
      where: { key },
      defaults: { count: 0, resetAt: new Date(Date.now() + seconds * 1000) },
      transaction,
    });
    const counter = await models.Counter.findByPk(key, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (counter.resetAt <= new Date()) {
      counter.count = 0;
      counter.resetAt = new Date(Date.now() + seconds * 1000);
    }
    return counter;
  }
  return {
    async check(scope, email, limit, seconds, transaction) {
      const counter = await row(scope, email, seconds, transaction);
      if (counter.count >= limit)
        return new AppError(
          429,
          'Too many attempts. Please try again later.',
          undefined,
          Math.max(1, Math.ceil((counter.resetAt - Date.now()) / 1000)),
        );
      return null;
    },
    async consume(scope, email, limit, seconds, transaction) {
      const counter = await row(scope, email, seconds, transaction);
      if (counter.count >= limit)
        return new AppError(
          429,
          'Too many attempts. Please try again later.',
          undefined,
          Math.max(1, Math.ceil((counter.resetAt - Date.now()) / 1000)),
        );
      counter.count += 1;
      await counter.save({ transaction });
      return null;
    },
    async reset(scope, email, transaction) {
      await models.Counter.destroy({ where: { key: keyFor(scope, email) }, transaction });
    },
  };
}
