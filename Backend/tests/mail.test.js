import test from 'node:test';
import assert from 'node:assert/strict';
import { mailService } from '../src/services/mail.service.js';

const env = {
  MAIL_TRANSPORT: 'smtp',
  SMTP_HOST: 'smtp.example.test',
  SMTP_PORT: 587,
  SMTP_SECURE: 'false',
  SMTP_USER: 'sender@example.test',
  SMTP_PASSWORD: 'fictional-app-password',
  MAIL_FROM: 'Fit District <sender@example.test>',
};

test('SMTP resolves each operation through the OS and verifies the original hostname over TLS', async () => {
  let resolutions = 0;
  let closed = 0;
  const options = [];
  const mail = mailService(env, {
    resolveHost: async (host, settings) => {
      assert.equal(host, env.SMTP_HOST);
      assert.deepEqual(settings, { all: true });
      resolutions++;
      return [
        { family: 6, address: '2001:db8::1' },
        { family: 4, address: '192.0.2.1' },
      ];
    },
    createTransport: (config) => {
      options.push(config);
      return {
        verify: async () => true,
        sendMail: async (message) => {
          assert.equal(message.from, env.MAIL_FROM);
          assert.equal(message.to, 'member@example.test');
          assert.match(message.text, /123456/);
          return { accepted: [message.to] };
        },
        close: () => closed++,
      };
    },
  });
  await mail.verify();
  await mail.sendCode({ email: 'member@example.test', code: '123456' });
  assert.equal(resolutions, 2);
  assert.equal(closed, 2);
  for (const config of options) {
    assert.equal(config.host, '192.0.2.1');
    assert.equal(config.servername, env.SMTP_HOST);
    assert.deepEqual(config.tls, { servername: env.SMTP_HOST, rejectUnauthorized: true });
    assert.equal(config.requireTLS, true);
    assert.equal(config.secure, false);
    assert.equal(config.disableFileAccess, true);
    assert.equal(config.disableUrlAccess, true);
  }
});

test('SMTP retains IPv6 and implicit TLS support and closes failed connections', async () => {
  let closed = false;
  const failure = Object.assign(new Error('synthetic certificate failure'), { code: 'ESOCKET' });
  const mail = mailService(
    { ...env, SMTP_PORT: 465, SMTP_SECURE: 'true' },
    {
      resolveHost: async () => [{ family: 6, address: '2001:db8::1' }],
      createTransport: (config) => {
        assert.equal(config.host, '2001:db8::1');
        assert.equal(config.port, 465);
        assert.equal(config.secure, true);
        assert.equal(config.tls.rejectUnauthorized, true);
        assert.equal(config.tls.servername, env.SMTP_HOST);
        return {
          verify: async () => {
            throw failure;
          },
          close: () => {
            closed = true;
          },
        };
      },
    },
  );
  await assert.rejects(mail.verify(), (error) => error === failure);
  assert.equal(closed, true);
});

test('unresolved SMTP hosts never create an unauthenticated fallback connection', async () => {
  const mail = mailService(env, {
    resolveHost: async () => [],
    createTransport: () => {
      assert.fail('No connection should open without a resolved host.');
    },
  });
  await assert.rejects(mail.verify(), { code: 'ENOTFOUND' });
});
