import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { runDatabaseSuite } from './database-suite.mjs';
import { nativePostgresAvailable, runNativeDatabaseTests } from './database-native.mjs';

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
  '-h',
  '127.0.0.1',
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
  if (nativePostgresAvailable() && !process.argv.includes('--docker')) {
    await runNativeDatabaseTests();
  } else {
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
        // The image's temporary initialization server accepts socket connections
        // before creating the database. Only its final server listens on TCP.
        docker([...psqlArgs, '-c', 'SELECT 1']);
        ready = true;
        break;
      } catch {
        await delay(500);
      }
    }
    if (!ready) throw new Error('Isolated PostgreSQL did not become ready');
    await runDatabaseSuite(sql, transaction);
  }
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
