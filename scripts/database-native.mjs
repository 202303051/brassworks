import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:net';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runDatabaseSuite } from './database-suite.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const binaries = join(root, '.tools', 'postgres-17.11-5', 'pgsql', 'bin');
export const nativePostgresAvailable = () =>
  process.platform === 'win32' &&
  existsSync(join(binaries, 'psql.exe')) &&
  existsSync(join(binaries, '..', '..', 'install-complete.sha256'));

export async function runNativeDatabaseTests() {
  if (!nativePostgresAvailable()) throw new Error('Run scripts/setup-database-local.ps1 first.');
  const base = resolve(root, '.tools', 'database-tests');
  mkdirSync(base, { recursive: true });
  const trustedBase = realpathSync(base);
  const id = randomUUID();
  const directory = join(trustedBase, 'run-' + id);
  mkdirSync(directory);
  const data = join(directory, 'data');
  const marker = join(directory, '.brassworks-disposable-test');
  writeFileSync(marker, id);
  const passwordFile = join(directory, 'bootstrap-password');
  const password = randomBytes(32).toString('hex');
  writeFileSync(passwordFile, password + '\n', { mode: 0o600 });
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (key.toUpperCase().startsWith('PG')) delete env[key];
  Object.assign(env, { PGPASSWORD: password, PGCLIENTENCODING: 'UTF8', PGCONNECT_TIMEOUT: '5' });
  const executable = (name) => join(binaries, name + '.exe');
  function run(name, args, options = {}) {
    const result = spawnSync(executable(name), args, {
      cwd: root,
      env,
      windowsHide: true,
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
      timeout: 90000,
      ...options,
    });
    if (result.error || result.status !== 0)
      throw new Error(
        result.error?.message ||
          result.stderr ||
          result.stdout ||
          `${name} exited ${result.status}`,
      );
    return result.stdout;
  }
  let port;
  try {
    port = await new Promise((accept, reject) => {
      const socket = createServer();
      socket.once('error', reject);
      socket.listen(0, '127.0.0.1', () => {
        const chosen = socket.address().port;
        socket.close((error) => (error ? reject(error) : accept(chosen)));
      });
    });
    run('initdb', [
      '-D',
      data,
      '-U',
      'brassworks_test_admin',
      '--auth=scram-sha-256',
      '--pwfile=' + passwordFile,
      '--encoding=UTF8',
      '--locale=C',
      '--no-sync',
    ]);
    rmSync(passwordFile);
    // A detached Windows postmaster can inherit pipe handles. Do not give its
    // startup command captured pipes, or spawnSync may wait for the server forever.
    run(
      'pg_ctl',
      [
        '-D',
        data,
        '-l',
        join(directory, 'postgres.log'),
        '-w',
        '-t',
        '30',
        '-o',
        `-h 127.0.0.1 -p ${port} -c max_connections=12 -c shared_buffers=16MB -c fsync=off -c timezone=UTC`,
        'start',
      ],
      { stdio: 'ignore' },
    );
    const connection = [
      '-h',
      '127.0.0.1',
      '-p',
      String(port),
      '-U',
      'brassworks_test_admin',
      '--no-password',
    ];
    run('createdb', [...connection, 'brassworks_test']);
    const args = [
      '-X',
      '--quiet',
      '-A',
      '-t',
      '-v',
      'ON_ERROR_STOP=1',
      ...connection,
      '-d',
      'brassworks_test',
    ];
    const prefix = "SET statement_timeout='30s'; SET lock_timeout='10s';\n";
    const sql = (source, label) => {
      const output = run('psql', args, { input: prefix + source });
      if (label) console.log('PASS ' + label);
      return output;
    };
    const transaction = (source) =>
      new Promise((accept, reject) => {
        const child = spawn(executable('psql'), args, {
          cwd: root,
          env,
          windowsHide: true,
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        let stdout = '';
        let stderr = '';
        const timer = setTimeout(() => {
          child.kill();
          reject(new Error('Concurrent SQL timed out'));
        }, 45000);
        child.stdout.on('data', (chunk) => {
          stdout += chunk;
        });
        child.stderr.on('data', (chunk) => {
          stderr += chunk;
        });
        child.once('error', (error) => {
          clearTimeout(timer);
          reject(error);
        });
        child.once('close', (code) => {
          clearTimeout(timer);
          accept({ code, stdout, stderr });
        });
        child.stdin.end(prefix + source);
      });
    console.log(
      'Testing disposable local ' +
        run('psql', ['--version']).trim() +
        ' on loopback; no production database is used.',
    );
    return await runDatabaseSuite(sql, transaction);
  } finally {
    const status = spawnSync(executable('pg_ctl'), ['-D', data, 'status'], {
      cwd: root,
      env,
      windowsHide: true,
      stdio: 'ignore',
    });
    if (status.error || ![0, 3, 4].includes(status.status))
      throw new Error(
        'Could not verify the temporary server stopped. Retained its cluster at ' + directory,
      );
    if (status.status === 0)
      run('pg_ctl', ['-D', data, '-m', 'fast', '-w', '-t', '20', 'stop'], { stdio: 'ignore' });
    // Delete only this run's verified, marked directory after its server stopped.
    const target = realpathSync(directory);
    if (!target.startsWith(trustedBase + sep) || readFileSync(marker, 'utf8') !== id)
      throw new Error('Refusing to remove an unrecognized database test directory.');
    rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    console.log('Removed this run’s temporary database cluster.');
  }
}
