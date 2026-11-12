import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

// A separate Vite process and fake Auth transport exercise the real SDK and UI.
// No credentials, hosted project, real mail or production account is involved.
const base = 'http://127.0.0.1:4177';
const service = 'https://brassworks-auth.example.test';
const server = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4177', '--strictPort'],
  {
    env: {
      ...process.env,
      VITE_SUPABASE_URL: service,
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_browser_fixture',
    },
    stdio: 'pipe',
  },
);
let output = '';
server.stdout.on('data', (data) => {
  output += data;
});
server.stderr.on('data', (data) => {
  output += data;
});
const installed = ['PROGRAMFILES', 'PROGRAMFILES(X86)', 'LOCALAPPDATA']
  .flatMap((key) =>
    process.env[key]
      ? ['Google/Chrome/Application/chrome.exe', 'Microsoft/Edge/Application/msedge.exe'].map(
          (path) => join(process.env[key], path),
        )
      : [],
  )
  .concat([
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ])
  .find(existsSync);
let browser;
let page;
let total = 0;
const errors = [];
const external = [];
const id = '13000000-0000-0000-0000-000000000001';

function fixture(role = 'viewer') {
  const state = {
    role,
    aal: 'aal1',
    factors: [],
    denied: false,
    badRpc: false,
    invites: [],
    password: '',
    logout: '',
    recover: 0,
    people: [
      {
        id,
        full_name: 'Test Administrator',
        role: 'admin',
        is_active: true,
        updated_at: '2026-11-12T00:00:00Z',
      },
      {
        id: '13000000-0000-0000-0000-000000000002',
        full_name: 'Test Colleague',
        role: 'viewer',
        is_active: true,
        updated_at: '2026-11-12T00:00:00Z',
      },
    ],
  };
  state.user = () => ({
    id,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'person@example.test',
    email_confirmed_at: '2026-11-12T00:00:00Z',
    created_at: '2026-11-12T00:00:00Z',
    app_metadata: { provider: 'email' },
    user_metadata: { role: 'admin' },
    factors: state.factors,
  });
  state.token = () => {
    const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
    return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: id, role: 'authenticated', aal: state.aal, amr: [{ method: 'password', timestamp: Math.floor(Date.now() / 1000) }], session_id: '14000000-0000-0000-0000-000000000001', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 })}.${Buffer.from('fixture signature').toString('base64url')}`;
  };
  state.session = () => ({
    access_token: state.token(),
    refresh_token: 'fake-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: state.user(),
  });
  return state;
}

async function setup(state) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === new URL(base).origin) return route.continue();
    if (url.origin !== service) {
      external.push(url.origin);
      return route.abort();
    }
    const reply = (value, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        },
        body: JSON.stringify(value),
      });
    if (request.method() === 'OPTIONS') return reply({});
    const data = request.postDataJSON() || {};
    if (url.pathname === '/auth/v1/token') {
      if (data.password === 'wrong password')
        return reply({ code: 'invalid_credentials', msg: 'Invalid login credentials' }, 400);
      return reply(state.session());
    }
    if (url.pathname === '/auth/v1/user') {
      if (request.method() === 'PUT') state.password = data.password;
      return reply(state.user());
    }
    if (url.pathname === '/auth/v1/recover') {
      state.recover++;
      return reply({});
    }
    if (url.pathname === '/auth/v1/logout') {
      state.logout = url.searchParams.get('scope');
      return reply({});
    }
    if (url.pathname === '/rest/v1/rpc/get_my_access')
      return state.badRpc
        ? reply({ message: 'Unavailable' }, 403)
        : reply(state.denied ? null : { id, full_name: 'Test Person', role: state.role });
    if (url.pathname === '/auth/v1/factors' && request.method() === 'POST') {
      const factor = {
        id: 'factor-1',
        factor_type: 'totp',
        status: 'unverified',
        friendly_name: 'Brassworks authenticator',
      };
      state.factors = [factor];
      return reply({
        id: factor.id,
        type: 'totp',
        totp: {
          qr_code:
            '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="black"/></svg>',
          secret: 'SYNTHETICTESTKEY',
          uri: 'otpauth://totp/Test?secret=SYNTHETICTESTKEY',
        },
      });
    }
    if (url.pathname.endsWith('/challenge'))
      return reply({
        id: 'challenge-1',
        type: 'totp',
        expires_at: Math.floor(Date.now() / 1000) + 60,
      });
    if (url.pathname.endsWith('/verify')) {
      if (data.code !== '123456') return reply({ message: 'Invalid code' }, 422);
      state.aal = 'aal2';
      state.factors.forEach((factor) => {
        factor.status = 'verified';
      });
      return reply(state.session());
    }
    if (url.pathname.startsWith('/auth/v1/factors/') && request.method() === 'DELETE') {
      state.factors = [];
      return reply({});
    }
    if (url.pathname === '/rest/v1/profiles') {
      if (request.method() === 'PATCH') {
        const person = state.people.find((item) => 'eq.' + item.id === url.searchParams.get('id'));
        Object.assign(person, data);
        return reply([{ id: person.id }]);
      }
      return reply(state.people);
    }
    if (url.pathname === '/functions/v1/invite-user') {
      state.invites.push(data);
      return reply({ sent: true });
    }
    throw new Error('Unexpected fixture endpoint: ' + url.pathname);
  });
  page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  return context;
}

async function signIn(password = 'valid test password') {
  await page.getByLabel('Email address', { exact: true }).fill('person@example.test');
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}
async function pass(name) {
  total++;
  console.log('PASS ' + name);
}

try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if ((await fetch(base)).ok) {
        ready = true;
        break;
      }
    } catch {
      /* Starting. */
    }
    await delay(150);
  }
  assert.ok(ready, output);
  mkdirSync('.tools', { recursive: true });
  writeFileSync(
    '.tools/auth-protected-fixture.txt',
    'Synthetic private setup fixture; never serve this file.',
  );
  for (const path of ['/.env.local', '/.tools/auth-protected-fixture.txt']) {
    const response = await fetch(base + path);
    assert.equal(response.status, 403, 'Development server must deny ' + path);
  }
  await pass('development server blocks environment and local setup files');
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || installed,
  });
  let state = fixture();
  let context = await setup(state);
  await page.goto(base + '/furnace/new');
  await page.getByRole('heading', { name: 'Sign in to Brassworks' }).waitFor();
  assert.equal(await page.getByRole('link', { name: 'New heat', exact: true }).count(), 0);
  await page.getByRole('link', { name: 'Privacy & data' }).click();
  await page.getByRole('heading', { name: 'Where your demo data lives.' }).waitFor();
  await page.goto(base + '/account');
  await pass('protected deep links require sign-in and privacy stays public');
  await page.getByRole('button', { name: 'Forgot password?' }).click();
  await page.getByLabel('Email address', { exact: true }).fill('unknown@example.test');
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await page.getByRole('status').filter({ hasText: 'If this email has an account' }).waitFor();
  assert.equal(state.recover, 1);
  await page.getByRole('button', { name: 'Back to sign in' }).click();
  await signIn('wrong password');
  await page.getByRole('alert').filter({ hasText: 'Sign-in failed' }).waitFor();
  await pass('reset response does not disclose membership and bad passwords stay signed out');
  await signIn();
  await page.getByRole('heading', { name: 'Your account' }).waitFor();
  await page.goto(base + '/departments/furnace');
  await page.getByRole('heading', { level: 1 }).waitFor();
  assert.equal(await page.getByRole('link', { name: 'New heat', exact: true }).count(), 0);
  assert.equal(await page.getByRole('button', { name: /^Delete / }).count(), 0);
  await page.goto(base + '/furnace/new');
  await page.getByRole('heading', { name: 'Access restricted' }).waitFor();
  await page.goto(base + '/team');
  await page.getByRole('heading', { name: 'Access restricted' }).waitFor();
  await pass('viewer ignores forged Admin metadata and cannot create, delete or manage team');
  state.denied = true;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.getByRole('alert').filter({ hasText: 'not verified and active' }).waitFor();
  assert.equal(await page.getByRole('link', { name: 'New heat', exact: true }).count(), 0);
  await pass('server-side deactivation closes the workspace at revalidation');
  await context.close();

  for (const [role, allowed, blocked] of [
    ['furnace_operator', '/furnace/new', '/output/new'],
    ['production_operator', '/plans/new', '/furnace/new'],
  ]) {
    state = fixture(role);
    context = await setup(state);
    await page.goto(base + '/account');
    await signIn();
    await page.getByRole('heading', { name: 'Your account' }).waitFor();
    await page.goto(base + allowed);
    await page.getByRole('button', { name: /Save/ }).first().waitFor();
    await page.goto(base + blocked);
    await page.getByRole('heading', { name: 'Access restricted' }).waitFor();
    await context.close();
  }
  await pass('department operators can open only their permitted write forms');

  state = fixture('admin');
  context = await setup(state);
  await page.goto(base + '/account');
  await signIn();
  await page.getByRole('heading', { name: 'Verify your identity' }).waitFor();
  await page.getByRole('button', { name: 'Set up authenticator' }).click();
  const qr = page.getByAltText('Authenticator setup QR code');
  await qr.waitFor();
  await qr.evaluate((img) => img.decode());
  assert.ok(await qr.evaluate((img) => img.naturalWidth > 0));
  await page.getByLabel('Authenticator code').fill('000000');
  await page.getByRole('button', { name: 'Verify code', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'could not be verified' }).waitFor();
  await page.getByLabel('Authenticator code').fill('123456');
  await page.getByRole('button', { name: 'Verify code', exact: true }).click();
  await page.getByRole('heading', { name: 'Your account' }).waitFor();
  await pass(
    'Admin is gated until TOTP enrollment and verification; QR renders and wrong codes fail',
  );
  await page.getByRole('link', { name: 'Manage team access' }).click();
  await page.getByRole('heading', { name: 'Team access' }).waitFor();
  await page.getByLabel('Full name', { exact: true }).fill('Invited Operator');
  await page.getByLabel('Email address', { exact: true }).fill('operator@example.test');
  await page
    .getByRole('combobox', { name: 'Invitation role', exact: true })
    .selectOption('furnace_operator');
  await page.getByRole('button', { name: 'Send invitation' }).click();
  await page.getByRole('status').filter({ hasText: 'Invitation sent' }).waitFor();
  assert.equal(state.invites[0].role, 'furnace_operator');
  await page
    .getByRole('combobox', { name: 'Role for Test Colleague', exact: true })
    .selectOption('manager');
  await page.getByRole('button', { name: 'Confirm access change' }).click();
  await page.getByRole('status').filter({ hasText: 'Team access updated' }).waitFor();
  assert.equal(state.people[1].role, 'manager');
  await page.getByRole('button', { name: 'Deactivate', exact: true }).nth(1).click();
  await page.getByRole('button', { name: 'Confirm access change' }).click();
  await page.getByRole('button', { name: 'Activate', exact: true }).waitFor();
  assert.equal(state.people[1].is_active, false);
  mkdirSync('.tools', { recursive: true });
  await page.screenshot({ path: '.tools/phase3-team-phone.png', fullPage: true });
  await pass('MFA Admin can invite, confirm role changes and deactivate a colleague');
  await page.goto(base + '/account');
  await page.getByRole('button', { name: 'Sign out on all devices' }).click();
  await page.getByRole('heading', { name: 'Sign in to Brassworks' }).waitFor();
  assert.equal(state.logout, 'global');
  await pass('global sign-out revokes through the SDK and closes account access');
  await context.close();

  for (const type of ['invite', 'recovery']) {
    state = fixture('manager');
    context = await setup(state);
    const hash = new URLSearchParams({
      ...state.session(),
      user: '',
      type,
      expires_at: String(Math.floor(Date.now() / 1000) + 3600),
    });
    await page.goto(base + '/account#' + hash);
    await page.getByRole('heading', { name: 'Set your password' }).waitFor();
    await page.getByLabel('New password', { exact: true }).fill('new test password 123');
    await page.getByLabel('Confirm password', { exact: true }).fill('new test password 123');
    await page.getByRole('button', { name: 'Save password' }).click();
    await page.getByRole('heading', { name: 'Your account' }).waitFor();
    assert.equal(state.password, 'new test password 123');
    assert.ok(!page.url().includes('access_token'));
    await context.close();
  }
  await pass('invite and recovery callbacks require password setup and remove URL credentials');

  state = fixture('manager');
  context = await setup(state);
  await page.goto(base + '/account');
  await page.getByRole('button', { name: 'Forgot password?' }).click();
  await page.getByLabel('Email address', { exact: true }).fill('person@example.test');
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await page.getByRole('status').filter({ hasText: 'If this email has an account' }).waitFor();
  await page.goto(base + '/account?code=synthetic-pkce-code');
  await page.getByRole('heading', { name: 'Set your password' }).waitFor();
  await page.getByLabel('New password', { exact: true }).fill('pkce test password 123');
  await page.getByLabel('Confirm password', { exact: true }).fill('pkce test password 123');
  await page.getByRole('button', { name: 'Save password' }).click();
  await page.getByRole('heading', { name: 'Your account' }).waitFor();
  assert.equal(state.password, 'pkce test password 123');
  assert.ok(!page.url().includes('code='));
  await pass('PKCE recovery exchanges the stored verifier and clears the callback code');
  await context.close();

  state = fixture('manager');
  context = await setup(state);
  await page.goto(base + '/account');
  await signIn();
  await page.getByRole('heading', { name: 'Your account' }).waitFor();
  await page.evaluate(() => {
    sessionStorage.setItem(
      'brassworks-session-clock',
      JSON.stringify({ started: Date.now() - 31 * 60000, active: Date.now() - 31 * 60000 }),
    );
    window.dispatchEvent(new Event('focus'));
  });
  await page.getByRole('heading', { name: 'Sign in to Brassworks' }).waitFor();
  assert.equal(state.logout, 'local');
  assert.equal(await page.evaluate(() => sessionStorage.getItem('brassworks-auth')), null);
  await pass('idle deadline signs out locally and removes stored session');
  await page.screenshot({ path: '.tools/phase3-account-phone.png', fullPage: true });
  await context.close();

  state = fixture('manager');
  state.badRpc = true;
  context = await setup(state);
  await page.goto(base + '/account');
  await signIn();
  await page.getByRole('alert').filter({ hasText: 'Cannot verify factory access' }).waitFor();
  await pass('profile verification failures never fall back to the public demo');
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  console.log(JSON.stringify({ total, pageErrors: errors, unexpectedExternal: external }));
} catch (error) {
  if (page && !page.isClosed())
    console.error((await page.locator('body').innerText()).slice(-8000));
  throw error;
} finally {
  await browser?.close();
  server.kill();
}
