import { readEnv } from './config/env.js';
import { createDatabase } from './config/database.js';
import { defineModels } from './models/index.js';
import { mailService } from './services/mail.service.js';
import { createApp } from './app.js';
import { startupErrorMessage } from './utils/startupError.js';
let db, server;
let stage = 'configuration';
try {
  const env = readEnv();
  stage = 'database';
  db = createDatabase(env);
  await db.authenticate();
  stage = 'tables';
  await db.query('SELECT id FROM users LIMIT 0');
  await db.query('SELECT id FROM member_accesses LIMIT 0');
  await db.query('SELECT id FROM attendance_visits LIMIT 0');
  await db.query('SELECT id FROM audit_logs LIMIT 0');
  await db.query('SELECT id FROM progress_entries LIMIT 0');
  await db.query('SELECT id FROM member_goals LIMIT 0');
  await db.query('SELECT version FROM member_profiles LIMIT 0');
  stage = 'email';
  const mail = mailService(env);
  await mail.verify();
  stage = 'application';
  const app = await createApp({ db, models: defineModels(db), env, mail });
  server = app.listen(env.PORT, '127.0.0.1', () =>
    console.log(`Fit District API: http://127.0.0.1:${env.PORT}`),
  );
  server.on('error', async () => {
    console.error('Cannot start API. Check the configured port.');
    await db.close();
    process.exitCode = 1;
  });
  for (const signal of ['SIGINT', 'SIGTERM'])
    process.on(signal, () => {
      server.close(async () => {
        await db.close();
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10000).unref();
    });
} catch (error) {
  console.error(startupErrorMessage(stage, error));
  if (db) await db.close();
  process.exitCode = 1;
}
