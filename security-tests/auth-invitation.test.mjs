import test from 'node:test';
import assert from 'node:assert/strict';
import { invitation, inviteHandler } from '../supabase/functions/invite-user/handler.mjs';

const body = { email: ' COLLEAGUE@example.test ', full_name: ' Test Colleague ', role: 'viewer' };
test('invitation accepts only bounded names, emails and known roles', () => {
  assert.deepEqual(invitation(body), {
    ...body,
    email: 'colleague@example.test',
    full_name: 'Test Colleague',
  });
  for (const role of ['admin', 'manager', 'furnace_operator', 'production_operator', 'viewer'])
    assert.ok(invitation({ ...body, role }));
  for (const invalid of [
    null,
    [],
    'body',
    {},
    { ...body, redirectTo: 'https://attacker.test' },
    ...['', 'bad', 'a@b', 'x'.repeat(255)].map((email) => ({ ...body, email })),
    ...['', ' ', 'x'.repeat(101), 'bad\nname'].map((full_name) => ({ ...body, full_name })),
    { ...body, role: 'owner' },
  ])
    assert.equal(invitation(invalid), null);
});

function fixture(options = {}) {
  const calls = [];
  const user = { id: 'admin-id', email_confirmed_at: '2026-11-12' };
  const caller = {
    auth: {
      getUser: async () => ({
        data: { user: options.unverified ? { id: user.id } : user },
        error: options.authError,
      }),
    },
    from: () => {
      const query = {
        select: (columns, config) => {
          query.counting = Boolean(config?.head);
          return query;
        },
        eq: () => query,
        is: () => query,
        single: async () => ({
          data: { role: options.role || 'admin', is_active: !options.inactive },
          error: options.accessError,
        }),
        insert: async (values) => {
          calls.push({ insert: values });
          return { error: options.profileError };
        },
        then: (resolve, reject) =>
          Promise.resolve({
            count: options.count === undefined ? 3 : options.count,
            error: options.countError,
          }).then(resolve, reject),
      };
      return query;
    },
  };
  const handler = inviteHandler({
    origins: ['https://factory.example.test'],
    callerClient: (token) => {
      calls.push({ authorization: token });
      if (options.throw) throw new Error('secret detail');
      return caller;
    },
    adminClient: () => {
      calls.push('admin-client');
      return {
        auth: {
          admin: {
            inviteUserByEmail: async (email, settings) => {
              calls.push({ email, settings });
              return { data: { user: { id: 'invited-id' } }, error: options.inviteError };
            },
          },
        },
      };
    },
  });
  const send = (overrides = {}) =>
    handler(
      new Request('https://project.example.test/functions/v1/invite-user', {
        method: 'POST',
        headers: {
          origin: 'https://factory.example.test',
          authorization: 'Bearer signed-test-token',
          'content-type': 'application/json',
          ...overrides.headers,
        },
        body:
          overrides.method && overrides.method !== 'POST'
            ? undefined
            : (overrides.body ?? JSON.stringify(body)),
        ...('method' in overrides ? { method: overrides.method } : {}),
      }),
    );
  return { send, calls };
}

test('origin, method and bearer checks run before any privileged operation', async () => {
  for (const [overrides, expected] of [
    [{ headers: { origin: 'https://attacker.test' } }, 403],
    [{ method: 'GET' }, 405],
    [{ method: 'OPTIONS' }, 204],
    [{ headers: { authorization: '' } }, 401],
    [{ headers: { authorization: 'Basic value' } }, 401],
  ]) {
    const { send, calls } = fixture();
    assert.equal((await send(overrides)).status, expected);
    assert.deepEqual(calls, []);
  }
});

test('server-verified identity and caller RLS protect invitations independently of role claims', async () => {
  for (const [options, status] of [
    [{ authError: true }, 401],
    [{ unverified: true }, 401],
    [{ role: 'manager' }, 403],
    [{ inactive: true }, 403],
    [{ accessError: true }, 403],
    [{ throw: true }, 503],
  ]) {
    const { send, calls } = fixture(options);
    const response = await send();
    assert.equal(response.status, status);
    assert.ok(!calls.includes('admin-client'));
    assert.ok(!(await response.text()).includes('secret detail'));
  }
});

test('bad input and unavailable capacity cannot send an invitation', async () => {
  for (const [options, overrides, status] of [
    [{}, { body: 'not json' }, 400],
    [{}, { body: 'x'.repeat(4097) }, 413],
    [{}, { body: '{}' }, 400],
    [{ count: 20 }, {}, 409],
    [{ count: null }, {}, 503],
    [{ countError: true }, {}, 503],
  ]) {
    const { send, calls } = fixture(options);
    assert.equal((await send(overrides)).status, status);
    assert.ok(!calls.includes('admin-client'));
  }
});

test('invitations use the allowed origin and audited caller-scoped profile insert', async () => {
  const { send, calls } = fixture();
  const response = await send();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://factory.example.test');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(
    calls.find((item) => item.settings),
    {
      email: 'colleague@example.test',
      settings: {
        redirectTo: 'https://factory.example.test/account',
        data: { full_name: 'Test Colleague' },
      },
    },
  );
  assert.deepEqual(calls.find((item) => item.insert).insert, {
    id: 'invited-id',
    full_name: 'Test Colleague',
    role: 'viewer',
    is_active: true,
  });
  assert.deepEqual(await response.json(), { sent: true });
});

test('failed invite or capacity-race profile insert fails closed without deleting Auth identities', async () => {
  for (const [options, status] of [
    [{ inviteError: true }, 400],
    [{ profileError: true }, 409],
  ]) {
    const { send, calls } = fixture(options);
    assert.equal((await send()).status, status);
    if (options.inviteError) assert.ok(!calls.some((item) => item.insert));
  }
});
