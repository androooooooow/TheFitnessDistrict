import { readEnv } from './config/env.js';
import { createDatabase } from './config/database.js';
import { defineModels } from './models/index.js';
import { mailService } from './services/mail.service.js';
import { createApp } from './app.js';
let db, server;
try {
  const env = readEnv();
  db = createDatabase(env);
  await db.authenticate();
  await db.query('SELECT id FROM users LIMIT 0');
  const mail = mailService(env);
  await mail.verify();
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
  console.error(
    error.message?.startsWith('Invalid configuration:') ||
      error.message?.startsWith('Configure SMTP')
      ? error.message
      : 'API startup failed. Check .env, PostgreSQL, migrations, and email settings.',
  );
  if (db) await db.close();
  process.exitCode = 1;
}
