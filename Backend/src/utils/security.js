import {
  randomBytes,
  randomInt,
  createHash,
  createHmac,
  timingSafeEqual,
  createCipheriv,
  createDecipheriv,
} from 'node:crypto';
import argon2 from 'argon2';
export const opaque = () => randomBytes(32).toString('hex');
export const digest = (value) => createHash('sha256').update(value).digest('hex');
export const hmac = (secret, value) => createHmac('sha256', secret).update(value).digest('hex');
export const equal = (a, b) =>
  typeof a === 'string' &&
  typeof b === 'string' &&
  a.length === b.length &&
  timingSafeEqual(Buffer.from(a), Buffer.from(b));
export const makeCode = () => String(randomInt(0, 1000000)).padStart(6, '0');
export const codeHash = (secret, id, code) => hmac(secret, `verify:${id}:${code}`);
export const hashPassword = (value) =>
  argon2.hash(value, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
export const verifyPassword = (hash, value) => argon2.verify(hash, value);
export function encrypt(value, key, purpose = 'profile') {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  cipher.setAAD(Buffer.from(`fit-district-${purpose}:v1`));
  const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return `v1.${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${data.toString('base64url')}`;
}
export function decrypt(value, key, purpose = 'profile') {
  const [version, iv, tag, data] = value.split('.');
  if (version !== 'v1') throw new Error('Unsupported encryption version.');
  const cipher = createDecipheriv(
    'aes-256-gcm',
    Buffer.from(key, 'hex'),
    Buffer.from(iv, 'base64url'),
  );
  cipher.setAAD(Buffer.from(`fit-district-${purpose}:v1`));
  cipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return JSON.parse(
    Buffer.concat([cipher.update(Buffer.from(data, 'base64url')), cipher.final()]).toString('utf8'),
  );
}
