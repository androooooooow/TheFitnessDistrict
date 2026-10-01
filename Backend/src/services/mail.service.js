import nodemailer from 'nodemailer';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
export function mailService(env) {
  if (env.MAIL_TRANSPORT === 'file') {
    if (env.NODE_ENV === 'production')
      throw new Error('Local mail capture is forbidden in production.');
    const folder = resolve('.mailbox');
    return {
      verify: async () => {},
      sendCode: async ({ email, code, challengeId }) => {
        await mkdir(folder, { recursive: true });
        await writeFile(
          resolve(folder, `${challengeId}.txt`),
          `LOCAL EMAIL TEST ONLY — no email was sent.\nTo: ${email}\nVerification code: ${code}\nExpires in 10 minutes.\n`,
          { mode: 0o600 },
        );
      },
    };
  }
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE === 'true',
    requireTLS: env.SMTP_SECURE !== 'true',
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    tls: { rejectUnauthorized: true },
    disableFileAccess: true,
    disableUrlAccess: true,
    connectionTimeout: 10000,
    socketTimeout: 15000,
  });
  return {
    verify: () => transport.verify(),
    sendCode: ({ email, code }) =>
      transport.sendMail({
        from: env.MAIL_FROM,
        to: email,
        subject: 'Verify your Fit District email',
        text: `Your Fit District verification code is ${code}.\n\nIt expires in 10 minutes. If you did not request this signup, ignore this message.\nNever share this code.`,
      }),
  };
}
