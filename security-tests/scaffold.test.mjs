import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const applicationFiles = [
  'src/lib/factory-time.js',
  'src/components/FactoryClock.jsx',
  'src/components/DepartmentBrief.jsx',
  'src/layouts/PublicLayout.jsx',
  'src/pages/Home.jsx',
  'src/pages/Furnace.jsx',
  'src/pages/Production.jsx',
  'src/pages/PhaseGuide.jsx',
  'src/pages/Privacy.jsx',
];

test('Phase 0 application source has no raw HTML execution sink', () => {
  for (const path of applicationFiles) {
    assert.doesNotMatch(
      read(path),
      /dangerouslySetInnerHTML|\.innerHTML\s*=|\beval\s*\(|new Function\s*\(/,
      path,
    );
  }
});

test('Phase 0 custom screens do not write or collect factory records', () => {
  for (const path of applicationFiles) {
    assert.doesNotMatch(
      read(path),
      /sdk\.table\s*\(|fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage/,
      path,
    );
  }
});

test('custom source does not contain known live-key formats', () => {
  const keyPattern =
    /sb_secret_[A-Za-z0-9_-]{12,}|sk_live_[A-Za-z0-9]{12,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/;

  for (const path of applicationFiles) {
    assert.doesNotMatch(read(path), keyPattern, path);
  }
});

test('home is a declared route and auth redirect names that route', () => {
  assert.match(read('src/pages/Home.jsx'), /export const route = \{ path: '\/'/);
  assert.match(read('src/config/app.config.js'), /redirectAfterAuth: '\/'/);
  assert.doesNotMatch(read('src/config/app.config.js'), /redirectAfterAuth: '\/dashboard'/);
});

test('secret files and signing material are ignored', () => {
  const ignored = read('.gitignore');

  for (const entry of [
    '.env',
    '.env.*',
    '!.env.example',
    '*.jks',
    '*.keystore',
    '*.p12',
    '*.mobileprovision',
    '*.pem',
  ]) {
    assert.ok(ignored.split('\n').includes(entry), entry);
  }
});

test('public guide does not import the private handoff or original brief', () => {
  const guide = read('src/pages/PhaseGuide.jsx');

  assert.doesNotMatch(guide, /phase0-handoff|from ['"].*docs|ORIGINAL_REQUIREMENTS/);
  assert.doesNotMatch(guide, /downloadText|createObjectURL|fetch/);
});
