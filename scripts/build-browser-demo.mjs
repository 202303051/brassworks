import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, realpathSync } from 'node:fs';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Regression fixtures must stay disconnected even after .env.local enables Auth.
// Each suite owns a separate build directory and leaves the normal dist untouched.
export function buildBrowserDemo(suite) {
  if (!['factory', 'spectro'].includes(suite)) throw new Error('Unknown browser fixture suite.');
  const root = realpathSync(fileURLToPath(new URL('../', import.meta.url)));
  const parent = join(root, '.tools', 'browser-test-builds');
  mkdirSync(parent, { recursive: true });
  if (!realpathSync(parent).startsWith(root + sep))
    throw new Error('Browser fixture directory escapes the project.');
  const outDir = join(parent, suite);
  if (existsSync(outDir) && !realpathSync(outDir).startsWith(realpathSync(parent) + sep))
    throw new Error('Unsafe browser fixture output directory.');
  execFileSync(
    process.execPath,
    ['node_modules/vite/bin/vite.js', 'build', '--outDir', outDir, '--emptyOutDir'],
    {
      cwd: root,
      env: { ...process.env, VITE_SUPABASE_URL: '', VITE_SUPABASE_PUBLISHABLE_KEY: '' },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  console.log(`Built isolated ${suite} demo fixture without hosted account settings.`);
  return outDir;
}
