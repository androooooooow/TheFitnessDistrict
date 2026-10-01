import test from 'node:test';
import assert from 'node:assert/strict';
import { signupSchema, profileSchema, bmi } from '../src/validators/auth.schema.js';
import { encrypt, decrypt, hashPassword, verifyPassword, codeHash } from '../src/utils/security.js';
import { valid } from './fixtures.js';
test('signup normalizes identifiers while preserving password and Unicode names', () => {
  const data = signupSchema.parse(valid);
  assert.equal(data.email, 'member@example.com');
  assert.equal(data.phone, '+639175550123');
  assert.equal(data.password, valid.password);
  assert.equal(data.fullName, valid.fullName);
});
test('signup rejects unknown permission fields and malformed or out-of-range values', () => {
  for (const input of [
    { role: 'admin' },
    { access: 'active' },
    { birthday: '2026-02-30' },
    { birthday: '2099-01-01' },
    { email: 'not-email' },
    { phone: 'contact me' },
    { weight: '75' },
    { weight: 0 },
    { height: 500 },
    { password: 'short' },
    { membership: 'weekly' },
    { rateCategory: 'other' },
    { address: '<script>bad</script>' },
  ])
    assert.equal(
      signupSchema.safeParse({ ...valid, ...input }).success,
      false,
      JSON.stringify(input),
    );
});
test('profile refuses email, membership, role and account-state mass assignment', () => {
  const { email, password, membership, rateCategory, ...profile } = signupSchema.parse(valid);
  assert.equal(profileSchema.safeParse(profile).success, true);
  for (const field of ['email', 'membership', 'role', 'enabled', 'userId'])
    assert.equal(profileSchema.safeParse({ ...profile, [field]: 'forged' }).success, false);
  assert.equal(bmi(75, 175), 24.5);
});
test('profile encryption authenticates ciphertext and uses a fresh nonce', () => {
  const key = 'ab'.repeat(32),
    input = { weight: 75, address: 'private address' };
  const first = encrypt(input, key);
  assert.notEqual(first, encrypt(input, key));
  assert.deepEqual(decrypt(first, key), input);
  assert.ok(!first.includes('private address'));
  assert.throws(() => decrypt(first, 'cd'.repeat(32)));
  const fields = first.split('.');
  fields[3] = (fields[3][0] === 'A' ? 'B' : 'A') + fields[3].slice(1);
  assert.throws(() => decrypt(fields.join('.'), key));
});
test('password hashes verify securely and code hashes bind the challenge', async () => {
  const hash = await hashPassword(valid.password);
  assert.match(hash, /^\$argon2id\$/);
  assert.ok(await verifyPassword(hash, valid.password));
  assert.equal(await verifyPassword(hash, 'different password'), false);
  assert.notEqual(codeHash('secret', 'one', '123456'), codeHash('secret', 'two', '123456'));
});
