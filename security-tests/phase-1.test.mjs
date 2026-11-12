import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
function walk(directory) {
  return readdirSync(new URL(directory + '/', root), { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)],
  );
}
const paths = [
  ...walk('src/features/factory').filter((path) => /\.jsx?$/.test(path)),
  ...['Home', 'Furnace', 'Production', 'Planning', 'Finished', 'Privacy'].map(
    (name) => 'src/pages/' + name + '.jsx',
  ),
  'src/layouts/PublicLayout.jsx',
];
test('custom demo screens render text without raw HTML execution sinks', () => {
  for (const path of paths)
    assert.doesNotMatch(
      read(path),
      /dangerouslySetInnerHTML|\.innerHTML\s*=|\beval\s*\(|new Function\s*\(/,
      path,
    );
});
test('public application does not import internal brief or handoff', () => {
  for (const path of paths)
    assert.doesNotMatch(
      read(path),
      /from ['"][^'"]*(?:docs\/|phase0-handoff|ORIGINAL_REQUIREMENTS)/,
      path,
    );
});
test('custom files do not contain recognised private key formats', () => {
  const pattern =
    /sb_secret_[A-Za-z0-9_-]{12,}|sk_live_[A-Za-z0-9]{12,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/;
  for (const path of paths) assert.doesNotMatch(read(path), pattern, path);
});
test('demo storage does not store authentication tokens or call a cloud data endpoint', () => {
  assert.doesNotMatch(
    read('src/features/factory/database.js'),
    /access_token|refresh_token|localStorage|sessionStorage|fetch\s*\(|XMLHttpRequest/,
  );
});
test('environment values and release keys stay ignored', () => {
  const ignored = read('.gitignore').split(/\r?\n/);
  for (const entry of ['.env', '.env.*', '!.env.example', '*.jks', '*.keystore', '*.p12', '*.pem'])
    assert.ok(ignored.includes(entry));
});
