import { execFileSync } from 'node:child_process';

const sources = [
  'src/lib/factory-time.js',
  'src/config/app.config.js',
  'src/content/phase-plan.js',
  'src/components/FactoryClock.jsx',
  'src/components/DepartmentBrief.jsx',
  'src/layouts/PublicLayout.jsx',
  'src/layouts/OwnerLayout.jsx',
  'src/pages/Home.jsx',
  'src/pages/Furnace.jsx',
  'src/pages/Production.jsx',
  'src/pages/PhaseGuide.jsx',
  'src/pages/Privacy.jsx',
  'src/services/userPermissions.js',
];

function run(command, args) {
  execFileSync(command, args, {
    stdio: 'inherit',
    shell: false,
    cwd: new URL('../', import.meta.url),
  });
}

run('npm', ['exec', '--yes', '--package=eslint@10.14.0', '--', 'eslint', ...sources]);
run('npm', [
  'exec',
  '--yes',
  '--package=prettier@3.6.2',
  '--',
  'prettier',
  '--check',
  ...sources,
  'src/theme.css',
  'tests/factory-time.test.mjs',
  'security-tests/scaffold.test.mjs',
  'eslint.config.js',
  '.prettierrc.json',
  'scripts/check-phase-0.mjs',
]);
run(process.execPath, [
  '--test',
  '--experimental-test-coverage',
  'tests/factory-time.test.mjs',
  'security-tests/scaffold.test.mjs',
]);
