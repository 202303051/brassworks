import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
function sources(directory) {
  return readdirSync(new URL(directory + '/', root), { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? sources(join(directory, entry.name)) : [join(directory, entry.name)],
  );
}

test('standalone runtime has no builder SDK, CDN or environment dependency', () => {
  for (const path of ['index.html', '.env.example', ...sources('src')]) {
    assert.doesNotMatch(
      read(path),
      /ApperSDK|apper\.io|apper\.so|integrately|VITE_APPER|services\/sdk/i,
      path,
    );
  }
});

test('standalone package no longer installs template session/store dependencies', () => {
  const manifest = JSON.parse(read('package.json'));
  for (const name of ['@reduxjs/toolkit', 'react-redux', 'shadcn']) {
    assert.equal(manifest.dependencies?.[name], undefined, name);
    assert.equal(manifest.devDependencies?.[name], undefined, name);
  }
});
