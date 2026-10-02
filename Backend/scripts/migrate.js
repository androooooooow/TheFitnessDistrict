import { pathToFileURL } from 'node:url';
import { readEnv } from '../src/config/env.js';
import { createDatabase } from '../src/config/database.js';
import { up as authUp } from '../migrations/001-auth.js';
import { up as gymUp } from '../migrations/002-gym.js';
import { up as progressUp } from '../migrations/003-progress.js';
export async function migrate(db) {
  await db.transaction(async (transaction) => {
    await db.query('SELECT pg_advisory_xact_lock(942717)', { transaction });
    await db.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
      { transaction },
    );
    for (const [name, up] of [
      ['001-auth', authUp],
      ['002-gym', gymUp],
      ['003-progress', progressUp],
    ]) {
      const [rows] = await db.query('SELECT name FROM schema_migrations WHERE name=$1', {
        bind: [name],
        transaction,
      });
      if (!rows.length) {
        await up(db, transaction);
        await db.query('INSERT INTO schema_migrations(name) VALUES ($1)', {
          bind: [name],
          transaction,
        });
      }
    }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let db;
  try {
    db = createDatabase(readEnv());
    await migrate(db);
    console.log('Account, gym, and progress migrations applied.');
  } catch {
    console.error('Migration failed. Check database access and configuration.');
    process.exitCode = 1;
  } finally {
    if (db) await db.close();
  }
}
