import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';

process.env.NODE_ENV = 'test';

const {
  app,
  distanceMeters,
  extractVerificationToken,
  gateConfigFor,
  gpsSecurity,
  hashPassword,
  normalizeEmail,
  normalizeIdentifier,
  normalizePhone,
  readToken,
  signToken,
  validatePassword,
  validateRuntimeConfig,
  validCoordinate,
  verifyPassword
} = await import('../server.js');

async function withServer(fn) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

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

test('GPS coordinate validation rejects impossible coordinates', () => {
  assert.equal(validCoordinate(-1.286389, 36.817223), true);
  assert.equal(validCoordinate(91, 36.817223), false);
  assert.equal(validCoordinate(-1.286389, 181), false);
  assert.equal(validCoordinate(Number.NaN, 36.817223), false);
});

test('distanceMeters returns realistic short distances', () => {
  const distance = distanceMeters(-1.286389, 36.817223, -1.286489, 36.817223);

  assert.ok(distance > 10);
  assert.ok(distance < 12);
});

test('gateConfigFor prefers named gate settings and falls back to organization gate settings', () => {
  const org = {
    back_settings: {
      gateLatitude: '-1.0',
      gateLongitude: '36.0',
      gateRadiusMeters: '100',
      gates: [{ name: 'North', latitude: '-1.5', longitude: '36.5', radiusMeters: '50' }]
    }
  };

  assert.deepEqual(gateConfigFor(org, 'North'), { latitude: -1.5, longitude: 36.5, radiusMeters: 50 });
  assert.deepEqual(gateConfigFor(org, 'South'), { latitude: -1, longitude: 36, radiusMeters: 100 });
});

test('GPS security thresholds are strict enough for gate scanning', () => {
  assert.equal(gpsSecurity.maxAccuracyMeters, 100);
  assert.equal(gpsSecurity.maxLocationAgeMs, 120000);
  assert.ok(gpsSecurity.maxJumpSpeedMetersPerSecond > 0);
});

test('QR endpoint returns a PNG and rejects empty data', async () => {
  await withServer(async (baseUrl) => {
    const ok = await fetch(`${baseUrl}/api/qr?data=${encodeURIComponent('verify-me')}`);
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get('content-type'), 'image/png');
    assert.ok((await ok.arrayBuffer()).byteLength > 100);

    const missing = await fetch(`${baseUrl}/api/qr`);
    assert.equal(missing.status, 400);
    assert.match(await missing.text(), /invalid qr data/i);
  });
});

test('backup exports require password-confirmed POST requests', async () => {
  await withServer(async (baseUrl) => {
    const adminBackup = await fetch(`${baseUrl}/api/backup`);
    assert.equal(adminBackup.status, 401);

    const orgBackup = await fetch(`${baseUrl}/api/org/backup`);
    assert.equal(orgBackup.status, 401);

    const authenticatedAdminBackup = await fetch(`${baseUrl}/api/backup`, {
      headers: { Authorization: `Bearer ${signToken({ scope: 'admin', user: 'tester' })}` }
    });
    assert.equal(authenticatedAdminBackup.status, 405);

    const authenticatedOrgBackup = await fetch(`${baseUrl}/api/org/backup`, {
      headers: { Authorization: `Bearer ${signToken({ scope: 'org', orgId: 'ORG-1' })}` }
    });
    assert.equal(authenticatedOrgBackup.status, 405);
  });
});
