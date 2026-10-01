import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
try {
  await readFile('.env');
  console.log('.env already exists; it was preserved.');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  let value = await readFile('.env.example', 'utf8');
  for (const key of ['JWT_SECRET', 'CODE_SECRET', 'CSRF_SECRET', 'FIELD_ENCRYPTION_KEY'])
    value = value
      .replace(`${key}=\n`, `${key}=${randomBytes(32).toString('hex')}\n`)
      .replace(`${key}=\r\n`, `${key}=${randomBytes(32).toString('hex')}\r\n`);
  await writeFile('.env', value, { flag: 'wx', mode: 0o600 });
  console.log(
    'Created .env with separate random keys. Fill in database and SMTP settings locally.',
  );
}
