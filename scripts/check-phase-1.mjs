import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

function walk(directory) {
  return readdirSync(new URL('../' + directory + '/', import.meta.url), {
    withFileTypes: true,
  }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)],
  );
}

const sources = walk('src');
function run(command, args) {
  execFileSync(command, args, {
    stdio: 'inherit',
    shell: false,
    cwd: new URL('../', import.meta.url),
  });
}
run('npm', ['exec', '--', 'eslint', ...sources.filter((p) => /\.(jsx?|mjs)$/.test(p))]);
run('npm', [
  'exec',
  '--',
  'prettier',
  '--check',
  ...sources,
  'tests/factory-model.test.mjs',
  'tests/factory-time.test.mjs',
  'security-tests/phase-1.test.mjs',
  'security-tests/standalone.test.mjs',
  'scripts/check-phase-1.mjs',
  'eslint.config.js',
]);
run(process.execPath, [
  '--test',
  '--experimental-test-coverage',
  '--test-coverage-lines=80',
  '--test-coverage-branches=80',
  '--test-coverage-functions=80',
  'tests/factory-model.test.mjs',
  'tests/factory-time.test.mjs',
  'security-tests/phase-1.test.mjs',
  'security-tests/standalone.test.mjs',
]);
