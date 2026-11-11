import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

// Never accepts a database URL: every run owns a fresh, network-isolated database.
const root = fileURLToPath(new URL('../', import.meta.url));
const container = `brassworks-test-${randomUUID().slice(0, 12)}`;
const image = 'postgres:17@sha256:ff87138949ad9a46f32ff23bd6852b52ce024a13dffe9b4087be98292cdd3b4f';
const env = { ...process.env };
for (const key of [
  'DOCKER_HOST',
  'DOCKER_CONTEXT',
  'DOCKER_TLS',
  'DOCKER_TLS_VERIFY',
  'DOCKER_CERT_PATH',
]) {
  delete env[key];
}
const localDocker =
  process.platform === 'win32' ? 'npipe:////./pipe/docker_engine' : 'unix:///var/run/docker.sock';
const dockerArgs = [`--host=${localDocker}`];
const psqlArgs = [
  'exec',
  '-i',
  container,
  'psql',
  '-X',
  '--quiet',
  '-A',
  '-t',
  '-v',
  'ON_ERROR_STOP=1',
  '-U',
  'postgres',
  '-d',
  'brassworks_test',
];
let running = false;

function docker(args, options = {}) {
  const result = spawnSync('docker', [...dockerArgs, ...args], {
    cwd: root,
    env,
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
    timeout: 120_000,
    ...options,
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      result.error?.message || result.stderr || result.stdout || `Docker exited ${result.status}`,
    );
  }
  return result.stdout;
}

function sql(source, label) {
  const output = docker(psqlArgs, {
    input: `SET statement_timeout = '45s'; SET lock_timeout = '10s';\n${source}`,
  });
  if (label) console.log(`PASS ${label}`);
  return output;
}

function transaction(source) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', [...dockerArgs, ...psqlArgs], { cwd: root, env });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('Concurrent SQL timed out'));
    }, 45_000);
    child.stdout.on('data', (data) => {
      stdout += data;
    });
    child.stderr.on('data', (data) => {
      stderr += data;
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
    child.stdin.end(`SET statement_timeout = '30s'; SET lock_timeout = '10s';\n${source}`);
  });
}

try {
  docker(['info', '--format', '{{.ServerVersion}}']);
  docker([
    'run',
    '--detach',
    '--rm',
    '--network',
    'none',
    '--name',
    container,
    '--env',
    'POSTGRES_HOST_AUTH_METHOD=trust',
    '--env',
    'POSTGRES_DB=brassworks_test',
    image,
  ]);
  running = true;
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      docker(['exec', container, 'pg_isready', '-U', 'postgres', '-d', 'brassworks_test']);
      ready = true;
      break;
    } catch {
      await delay(500);
    }
  }
  if (!ready) throw new Error('Isolated PostgreSQL did not become ready');
  sql(
    readFileSync(`${root}supabase/tests/000_bootstrap.sql`, 'utf8'),
    'local Supabase auth test shim',
  );
  const migrations = readdirSync(`${root}supabase/migrations`)
    .filter((name) => name.endsWith('.sql'))
    .sort();
  if (!migrations.length) throw new Error('No database migrations found');
  for (const name of migrations)
    sql(readFileSync(`${root}supabase/migrations/${name}`, 'utf8'), `migration ${name}`);
  sql(readFileSync(`${root}supabase/seed.sql`, 'utf8'), 'fake factory seed');
  const tests = readdirSync(`${root}supabase/tests`)
    .filter((name) => name.endsWith('.test.sql'))
    .sort();
  if (!tests.length) throw new Error('No SQL behavioral tests found');
  for (const name of tests) {
    const output = sql(readFileSync(`${root}supabase/tests/${name}`, 'utf8'));
    const count = output.match(/DATABASE_ASSERTIONS=(\d+)/);
    if (!count || Number(count[1]) < 1)
      throw new Error(`${name}: no completed assertions reported`);
    console.log(`PASS ${name}: ${count[1]} SQL assertions`);
  }
  const cases = JSON.parse(readFileSync(`${root}supabase/tests/concurrency-cases.json`, 'utf8'));
  if (cases.length < 2) throw new Error('Stock and active-user concurrency cases are required');
  for (const test of cases) {
    sql(test.setup);
    const outcomes = await Promise.all(test.transactions.map(transaction));
    const successes = outcomes.filter((result) => result.code === 0);
    const failures = outcomes.filter((result) => result.code !== 0);
    if (successes.length !== 1 || failures.length !== 1) {
      throw new Error(
        `${test.name}: expected one successful transaction and one rejection: ${JSON.stringify(outcomes)}`,
      );
    }
    if (!new RegExp(test.expectedError, 'i').test(failures[0].stderr)) {
      throw new Error(`${test.name}: unexpected failure: ${failures[0].stderr}`);
    }
    const output = docker([...psqlArgs, '-A', '-t'], { input: test.verify }).trim();
    const result = JSON.parse(output);
    if (result.ok !== true) throw new Error(`${test.name}: invalid final state: ${output}`);
    console.log(`PASS concurrent ${test.name}: ${output}`);
  }
  console.log('Database constraints, policies, triggers and concurrent-write checks passed.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (running) {
    try {
      docker(['rm', '--force', container]);
    } catch (error) {
      console.error(`Could not remove test container ${container}: ${error.message}`);
      process.exitCode = 1;
    }
  }
}
