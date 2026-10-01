import { readEnv } from '../src/config/env.js';
import { createDatabase } from '../src/config/database.js';
const db = createDatabase(readEnv());
try {
  await db.transaction(async (transaction) => {
    await db.query(
      "DELETE FROM signup_challenges WHERE expires_at < now() - interval '24 hours'; DELETE FROM auth_counters WHERE reset_at < now(); DELETE FROM auth_sessions WHERE expires_at < now();",
      { transaction },
    );
  });
  console.log('Expired authentication records cleaned.');
} finally {
  await db.close();
}
