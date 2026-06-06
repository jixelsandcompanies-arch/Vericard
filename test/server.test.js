import assert from 'node:assert/strict';
import test from 'node:test';

process.env.NODE_ENV = 'test';

const {
  extractVerificationToken,
  hashPassword,
  normalizeEmail,
  normalizeIdentifier,
  normalizePhone,
  readToken,
  signToken,
  validatePassword,
  validateRuntimeConfig,
  verifyPassword
} = await import('../server.js');

test('password hashing verifies the original password only', () => {
  const { salt, passwordHash } = hashPassword('correct horse battery staple');

  assert.equal(verifyPassword('correct horse battery staple', salt, passwordHash), true);
  assert.equal(verifyPassword('wrong password', salt, passwordHash), false);
});

test('signed tokens round-trip and reject tampering', () => {
  const token = signToken({ scope: 'org', orgId: 'ORG-1' });
  const payload = readToken(token);

  assert.equal(payload.scope, 'org');
  assert.equal(payload.orgId, 'ORG-1');
  assert.equal(readToken(`${token.slice(0, -1)}x`), null);
});

test('verification tokens are extracted from plain values and URLs', () => {
  assert.equal(extractVerificationToken('abc123'), 'abc123');
  assert.equal(extractVerificationToken('https://example.test/?token=abc123'), 'abc123');
  assert.equal(extractVerificationToken('https://example.test/path?x=1&token=abc123&y=2'), 'abc123');
});

test('normalizers produce stable lookup values', () => {
  assert.equal(normalizeEmail(' ADMIN@Example.COM '), 'admin@example.com');
  assert.equal(normalizeIdentifier(' ab-12 34 '), 'AB1234');
  assert.equal(normalizePhone('0712 345 678'), '254712345678');
});

test('password validation enforces minimum length', () => {
  assert.equal(validatePassword('1234567'), 'Password must be at least 8 characters.');
  assert.equal(validatePassword('12345678'), '');
});

test('production runtime config rejects unsafe defaults', () => {
  const errors = validateRuntimeConfig({
    NODE_ENV: 'production',
    SESSION_SECRET: 'mapphex-local-secret',
    ADMIN_PASSWORD: 'admin12345',
    EXPOSE_RESET_CODES: 'true'
  });

  assert.ok(errors.some((error) => error.includes('SESSION_SECRET')));
  assert.ok(errors.some((error) => error.includes('ADMIN_USER')));
  assert.ok(errors.some((error) => error.includes('ADMIN_PASSWORD')));
  assert.ok(errors.some((error) => error.includes('SUPABASE_URL')));
  assert.ok(errors.some((error) => error.includes('EXPOSE_RESET_CODES')));
});
