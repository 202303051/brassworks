import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { stripVTControlCharacters } from 'node:util';

const root = fileURLToPath(new URL('../', import.meta.url));
const url = 'http://127.0.0.1:4175';
const server = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    'preview',
    '--host',
    '127.0.0.1',
    '--port',
    '4175',
    '--strictPort',
  ],
  {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);
let serverOutput = '';
let serverFailure;
server.stdout.on('data', (data) => {
  serverOutput += data;
});
server.stderr.on('data', (data) => {
  serverOutput += data;
});
server.on('error', (error) => {
  serverFailure = error;
});
server.on('exit', (code) => {
  serverFailure = new Error(`Preview server exited ${code}: ${serverOutput}`);
});

try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (serverFailure) throw serverFailure;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(500) });
      if (stripVTControlCharacters(serverOutput).includes(url) && response.ok) {
        ready = true;
        break;
      }
    } catch {
      /* The preview server is still starting. */
    }
    await delay(200);
  }
  if (!ready) throw new Error(`Preview server did not become ready: ${serverOutput}`);
  const code = await new Promise((resolve, reject) => {
    const test = spawn(process.execPath, ['tests/browser-demo.cjs'], {
      cwd: root,
      env: { ...process.env, APP_BASE_URL: url },
      stdio: 'inherit',
    });
    test.on('error', reject);
    test.on('exit', resolve);
  });
  if (code !== 0) process.exitCode = 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  server.kill('SIGTERM');
}
