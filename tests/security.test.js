import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../functions/api/utils/password.js';
import { signJWT, verifyJWT } from '../functions/api/utils/jwt.js';

test('PBKDF2 password hashes use a random salt and verify correctly', async () => {
  const first = await hashPassword('A-safe-password-2026');
  const second = await hashPassword('A-safe-password-2026');
  assert.notEqual(first, second);
  assert.equal(await verifyPassword('A-safe-password-2026', first), true);
  assert.equal(await verifyPassword('wrong-password', first), false);
});

test('JWT signature rejects a different secret', async () => {
  const token = await signJWT({ sub: 7, role: 'reader' }, 'a-long-test-secret');
  assert.equal((await verifyJWT(token, 'a-long-test-secret')).sub, 7);
  assert.equal(await verifyJWT(token, 'another-long-secret'), null);
});
