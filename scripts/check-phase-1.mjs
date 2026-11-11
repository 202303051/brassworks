import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

function walk(directory) {
  return readdirSync(new URL('../' + directory + '/', import.meta.url), {
    withFileTypes: true,
  }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)],
  );
}

const sources = walk('src');
const tests = ['tests', 'security-tests']
  .flatMap((directory) => walk(directory))
  .filter((path) => path.endsWith('.test.mjs'));
function run(command, args) {
  execFileSync(command, args, {
    stdio: 'inherit',
    shell: false,
    cwd: new URL('../', import.meta.url),
  });
}
// Execute installed JavaScript CLIs directly: npm.cmd cannot be spawned with
// shell:false on Windows, and a project-local Node need not be on the global PATH.
const cli = (path) => fileURLToPath(new URL('../node_modules/' + path, import.meta.url));
run(process.execPath, [
  cli('eslint/bin/eslint.js'),
  ...sources.filter((p) => /\.(jsx?|mjs)$/.test(p)),
]);
run(process.execPath, [
  cli('prettier/bin/prettier.cjs'),
  '--check',
  ...sources,
  ...tests,
  'scripts/check-phase-1.mjs',
  'eslint.config.js',
]);
run(process.execPath, [
  '--test',
  '--experimental-test-coverage',
  '--test-coverage-lines=80',
  '--test-coverage-branches=80',
  '--test-coverage-functions=80',
  ...tests,
]);
