import nodemailer from 'nodemailer';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { lookup } from 'node:dns/promises';
export function mailService(
  env,
  { resolveHost = lookup, createTransport = (options) => nodemailer.createTransport(options) } = {},
) {
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
  async function withTransport(operation) {
    // Use the OS resolver (including Windows DNS policy), refreshing before each operation.
    const addresses = await resolveHost(env.SMTP_HOST, { all: true });
    const destination = addresses.find((entry) => entry.family === 4) || addresses[0];
    if (!destination)
      throw Object.assign(new Error('SMTP hostname could not be resolved.'), { code: 'ENOTFOUND' });
    const transport = createTransport({
      host: destination.address,
      servername: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE === 'true',
      requireTLS: env.SMTP_SECURE !== 'true',
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
      tls: { servername: env.SMTP_HOST, rejectUnauthorized: true },
      disableFileAccess: true,
      disableUrlAccess: true,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
    try {
      return await operation(transport);
    } finally {
      transport.close();
    }
  }
  return {
    verify: () => withTransport((transport) => transport.verify()),
    sendCode: ({ email, code }) =>
      withTransport((transport) =>
        transport.sendMail({
          from: env.MAIL_FROM,
          to: email,
          subject: 'Verify your Fit District email',
          text: `Your Fit District verification code is ${code}.\n\nIt expires in 10 minutes. If you did not request this signup, ignore this message.\nNever share this code.`,
        }),
      ),
  };
}
