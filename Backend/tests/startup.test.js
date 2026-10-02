import test from 'node:test';
import assert from 'node:assert/strict';
import { startupErrorMessage } from '../src/utils/startupError.js';

test('startup identifies rejected PostgreSQL credentials without revealing the underlying error', () => {
  const error = {
    original: { code: '28P01' },
    message: 'password authentication failed for private-user: private-password',
    stack: 'private stack',
  };
  const message = startupErrorMessage('database', error);
  assert.match(message, /PostgreSQL rejected the database username or password/);
  assert.match(message, /DATABASE_URL/);
  assert.doesNotMatch(message, /private-/);
});

test('startup distinguishes the database, tables, and SMTP failures', () => {
  const cases = [
    ['database', { original: { code: '3D000' } }, /database named in DATABASE_URL does not exist/],
    ['database', { original: { code: 'ECONNREFUSED' } }, /PostgreSQL is unreachable/],
    ['tables', { original: { code: '42P01' } }, /account or gym tables are missing/],
    ['tables', { original: { code: '42501' } }, /cannot read the account tables/],
    ['email', { code: 'EAUTH' }, /SMTP authentication was rejected/],
    ['email', { code: 'ETIMEDOUT' }, /SMTP server could not be reached/],
    ['email', { code: 'ESOCKET' }, /SMTP connection failed/],
    ['email', { code: 'SELF_SIGNED_CERT_IN_CHAIN' }, /SMTP certificate could not be validated/],
    [
      'email',
      { code: 'ESOCKET', message: 'self-signed certificate in certificate chain' },
      /SMTP certificate could not be validated/,
    ],
  ];
  for (const [stage, error, expected] of cases)
    assert.match(startupErrorMessage(stage, error), expected);
});

test('unknown startup failures never echo credentials, server responses, or stack traces', () => {
  const error = {
    message: 'postgresql://private-user:private-password@private-host/db',
    response: 'private SMTP response',
    stack: 'private stack',
  };
  for (const stage of ['configuration', 'database', 'tables', 'email', 'application']) {
    assert.doesNotMatch(startupErrorMessage(stage, error), /private/);
  }
  assert.equal(
    startupErrorMessage('configuration', { message: 'Use separate security keys.' }),
    'Use separate security keys.',
  );
});
