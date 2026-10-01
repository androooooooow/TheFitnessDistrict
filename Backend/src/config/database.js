import { Sequelize } from 'sequelize';
import { readFileSync } from 'node:fs';
export function createDatabase(env) {
  return new Sequelize(env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    pool: { max: 5, min: 0 },
    dialectOptions:
      env.DATABASE_SSL === 'true'
        ? {
            ssl: {
              require: true,
              rejectUnauthorized: true,
              ...(env.DATABASE_CA_FILE ? { ca: readFileSync(env.DATABASE_CA_FILE, 'utf8') } : {}),
            },
          }
        : {},
  });
}
