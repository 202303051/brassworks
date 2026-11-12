import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authConfig,
  canWrite,
  IDLE_MS,
  SESSION_MS,
  sessionExpired,
  passwordError,
  validProfile,
  writeEntity,
  ROLES,
} from '../src/features/auth/policy.js';

test('no configuration preserves demo; partial or secret configuration fails closed', () => {
  assert.deepEqual(authConfig({}), { enabled: false });
  const key = 'sb_publishable_fixture';
  for (const env of [
    { VITE_SUPABASE_URL: 'https://example.test' },
    { VITE_SUPABASE_PUBLISHABLE_KEY: key },
    ...[
      'http://example.test',
      'file:///project',
      'https://user:pass@example.test',
      'https://example.test/path',
      'https://example.test?x=1',
      'https://example.test#secret',
      'invalid',
    ].map((url) => ({ VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: key })),
  ]) {
    assert.equal(authConfig(env).enabled, true);
    assert.ok(authConfig(env).error);
  }
  assert.equal(
    authConfig({ VITE_SUPABASE_URL: 'https://example.test/', VITE_SUPABASE_PUBLISHABLE_KEY: key })
      .url,
    'https://example.test',
  );
  assert.equal(
    authConfig({ VITE_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_SUPABASE_PUBLISHABLE_KEY: key })
      .enabled,
    true,
  );
  const jwt = (role) =>
    'e30.' + Buffer.from(JSON.stringify({ role })).toString('base64url') + '.signature';
  for (const secret of ['sb_secret_test', jwt('service_role'), 'a.invalid.b', 'a.e30.b'])
    assert.ok(
      authConfig({
        VITE_SUPABASE_URL: 'https://example.test',
        VITE_SUPABASE_PUBLISHABLE_KEY: secret,
      }).error,
    );
  assert.equal(
    authConfig({
      VITE_SUPABASE_URL: 'https://example.test',
      VITE_SUPABASE_PUBLISHABLE_KEY: jwt('anon'),
    }).key,
    jwt('anon'),
  );
});

test('role write permissions follow database domains and reject unknown domains', () => {
  const expected = {
    admin: ['heats', 'billets', 'plans', 'outputs', 'masters'],
    manager: ['heats', 'billets', 'plans', 'outputs', 'masters'],
    furnace_operator: ['heats', 'masters'],
    production_operator: ['billets', 'plans', 'outputs', 'masters'],
    viewer: [],
  };
  for (const role of [...Object.keys(ROLES), 'unknown', undefined])
    for (const entity of ['heats', 'billets', 'plans', 'outputs', 'masters', 'profiles', 'unknown'])
      assert.equal(
        canWrite(role, entity),
        Boolean(expected[role]?.includes(entity)),
        `${role}/${entity}`,
      );
});

test('profile gate requires verified identity and the exact server profile ID', () => {
  const user = { id: 'user-1', email_confirmed_at: '2026-11-12' };
  assert.equal(validProfile({ id: user.id, role: 'admin' }, user), true);
  for (const profile of [
    null,
    { id: 'user-2', role: 'admin' },
    { id: user.id, role: 'owner' },
    { id: user.id, role: 'toString' },
  ])
    assert.equal(validProfile(profile, user), false);
  assert.equal(validProfile({ id: user.id, role: 'viewer' }, { id: user.id }), false);
  assert.equal(validProfile(null, null), false);
});

test('password validation and idle/absolute session deadlines', () => {
  assert.ok(passwordError('short', 'short'));
  assert.ok(passwordError('x'.repeat(129), 'x'.repeat(129)));
  assert.ok(passwordError('long enough password', 'different password'));
  assert.equal(passwordError('long enough password', 'long enough password'), '');
  const now = 100000000;
  assert.equal(sessionExpired(now - 100, now - 10, now), false);
  assert.equal(sessionExpired(now - SESSION_MS, now, now), true);
  assert.equal(sessionExpired(now - IDLE_MS, now - IDLE_MS, now), true);
  for (const [started, active] of [
    [NaN, now],
    [now, null],
    [now + 1, now],
    [now, now + 1],
  ])
    assert.equal(sessionExpired(started, active, now), true);
  assert.equal(sessionExpired(Date.now(), Date.now()), false);
});

test('direct new/edit routes map to the appropriate write domain', () => {
  for (const [prefix, entity] of [
    ['furnace', 'heats'],
    ['billets', 'billets'],
    ['plans', 'plans'],
    ['output', 'outputs'],
  ]) {
    assert.equal(writeEntity(`/${prefix}/new`), entity);
    assert.equal(writeEntity(`/${prefix}/abc/edit/`), entity);
    assert.equal(writeEntity(`/${prefix}/abc`), null);
  }
  for (const path of ['/', '/team', '/furnace/new/extra', '/unknown/new'])
    assert.equal(writeEntity(path), null);
});
