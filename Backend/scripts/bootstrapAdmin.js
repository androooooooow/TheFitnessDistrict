import { createInterface } from 'node:readline/promises';
import { randomUUID } from 'node:crypto';
import { readEnv } from '../src/config/env.js';
import { createDatabase } from '../src/config/database.js';
import { defineModels } from '../src/models/index.js';
import { emailSchema, signupSchema } from '../src/validators/auth.schema.js';
import { hashPassword } from '../src/utils/security.js';
if (!process.stdin.isTTY) throw new Error('Run admin setup in an interactive terminal.');
const reader = createInterface({ input: process.stdin, output: process.stdout });
const email = emailSchema.parse(await reader.question('Administrator email: '));
reader.close();
function secret() {
  return new Promise((resolve) => {
    let value = '';
    process.stdout.write('Administrator password (hidden): ');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    const handler = (chunk) => {
      for (const char of chunk) {
        if (char === '\u0003') {
          process.stdin.setRawMode(false);
          process.exit(1);
        }
        if (char === '\r' || char === '\n') {
          process.stdin.off('data', handler);
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdout.write('\n');
          resolve(value);
          return;
        }
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
        else if (char >= ' ') value += char;
      }
    };
    process.stdin.on('data', handler);
  });
}
const password = signupSchema.shape.password.parse(await secret());
let db;
try {
  db = createDatabase(readEnv());
  const { User } = defineModels(db);
  if (await User.findOne({ where: { email } }))
    throw new Error('An account with that email already exists.');
  await User.create({
    id: randomUUID(),
    email,
    passwordHash: await hashPassword(password),
    role: 'admin',
    enabled: true,
    emailVerifiedAt: new Date(),
    createdAt: new Date(),
  });
  console.log('Administrator account created through trusted local setup.');
} catch (error) {
  console.error(
    error.message === 'An account with that email already exists.'
      ? error.message
      : 'Admin setup failed. Check configuration and migrations.',
  );
  process.exitCode = 1;
} finally {
  if (db) await db.close();
}
