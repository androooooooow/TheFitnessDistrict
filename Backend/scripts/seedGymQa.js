// Fictional accounts for isolated browser QA only. Never runs against the app database.
import { randomUUID } from 'node:crypto';
import { readEnv } from '../src/config/env.js';
import { createDatabase } from '../src/config/database.js';
import { defineModels } from '../src/models/index.js';
import { hashPassword, encrypt } from '../src/utils/security.js';
const env = readEnv();
const url = new URL(env.DATABASE_URL);
if (
  env.NODE_ENV !== 'test' ||
  !['127.0.0.1', 'localhost'].includes(url.hostname) ||
  !url.pathname.endsWith('_test')
)
  throw new Error('QA seed requires an isolated local test database.');
const db = createDatabase(env),
  models = defineModels(db);
try {
  if (await models.User.count()) throw new Error('QA seed requires an empty fixture.');
  const passwordHash = await hashPassword('GymQa!2026Testing');
  for (const [role, name] of [
    ['admin', 'QA Administrator'],
    ['user', 'QA Gym Member'],
  ]) {
    const id = randomUUID();
    await models.User.create({
      id,
      email: `${role}@example.test`,
      passwordHash,
      role,
      enabled: true,
      emailVerifiedAt: new Date(),
      createdAt: new Date(),
    });
    await models.Profile.create({
      userId: id,
      code: `QA-${role.toUpperCase()}`,
      requestedMembership: 'monthly',
      rateCategory: 'student',
      encryptedData: encrypt(
        {
          fullName: name,
          birthday: '2000-01-01',
          sex: 'male',
          address: 'Fictional QA address',
          phone: '09171234567',
          weight: 75,
          height: 175,
        },
        env.FIELD_ENCRYPTION_KEY,
      ),
    });
  }
  console.log('Fictional gym QA fixture ready.');
} finally {
  await db.close();
}
