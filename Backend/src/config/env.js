import 'dotenv/config';
import { z } from 'zod';
export function readEnv(input = process.env) {
  const schema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    FRONTEND_ORIGIN: z.string().url(),
    DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//),
    JWT_SECRET: z.string().min(64),
    CODE_SECRET: z.string().min(64),
    CSRF_SECRET: z.string().min(64),
    FIELD_ENCRYPTION_KEY: z.string().regex(/^[a-f\d]{64}$/i),
    DATABASE_SSL: z.enum(['true', 'false']).default('false'),
    DATABASE_CA_FILE: z.string().default(''),
    MAIL_TRANSPORT: z.enum(['smtp', 'file']).default('smtp'),
    SMTP_HOST: z.string().default(''),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
    SMTP_SECURE: z.enum(['true', 'false']).default('false'),
    SMTP_USER: z.string().default(''),
    SMTP_PASSWORD: z.string().default(''),
    MAIL_FROM: z.string().default(''),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(3).default(0),
  });
  const result = schema.safeParse(input);
  if (!result.success)
    throw new Error(
      `Invalid configuration: ${[...new Set(result.error.issues.map((i) => i.path[0]))].join(', ')}`,
    );
  const env = result.data;
  env.FRONTEND_ORIGIN = new URL(env.FRONTEND_ORIGIN).origin;
  if (
    new Set([env.JWT_SECRET, env.CODE_SECRET, env.CSRF_SECRET, env.FIELD_ENCRYPTION_KEY]).size !== 4
  )
    throw new Error('Use separate security keys.');
  if (
    env.NODE_ENV === 'production' &&
    (!env.FRONTEND_ORIGIN.startsWith('https://') ||
      env.DATABASE_SSL !== 'true' ||
      env.MAIL_TRANSPORT !== 'smtp')
  )
    throw new Error('Production requires HTTPS, database TLS, and SMTP email.');
  if (
    env.MAIL_TRANSPORT === 'smtp' &&
    (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD || !env.MAIL_FROM)
  )
    throw new Error('Configure SMTP_HOST, SMTP_USER, SMTP_PASSWORD, and MAIL_FROM.');
  return env;
}
