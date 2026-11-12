import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { networkInterfaces } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';
import { buildBrowserDemo } from './build-browser-demo.mjs';

const host =
  Object.values(networkInterfaces())
    .flat()
    .find(
      (item) =>
        item.family === 'IPv4' &&
        !item.internal &&
        /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(item.address),
    )?.address || '127.0.0.1';
const base = `http://${host}:4176`;
const outDir = buildBrowserDemo('spectro');
const server = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    'preview',
    '--outDir',
    outDir,
    '--host',
    host,
    '--port',
    '4176',
    '--strictPort',
  ],
  { stdio: 'pipe' },
);
let output = '';
server.stdout.on('data', (data) => {
  output += data;
});
server.stderr.on('data', (data) => {
  output += data;
});
let browser;
let page;
const errors = [];
try {
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      if ((await fetch(base, { signal: AbortSignal.timeout(500) })).ok) {
        ready = true;
        break;
      }
    } catch {
      /* Starting. */
    }
    await delay(150);
  }
  assert.ok(ready, output);
  const installed = ['PROGRAMFILES', 'PROGRAMFILES(X86)', 'LOCALAPPDATA']
    .flatMap((key) =>
      process.env[key]
        ? ['Google/Chrome/Application/chrome.exe', 'Microsoft/Edge/Application/msedge.exe'].map(
            (path) => join(process.env[key], path),
          )
        : [],
    )
    .find(existsSync);
  browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROMIUM_PATH ||
      installed ||
      [
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
      ].find(existsSync),
    args: ['--no-sandbox'],
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const external = [];
  const uploads = [];
  await context.route('**/*', async (route) => {
    const request = route.request();
    if (new URL(request.url()).origin !== new URL(base).origin) {
      external.push(request.url());
      return route.abort();
    }
    if (request.method() !== 'GET') uploads.push(request.url());
    return route.continue();
  });
  page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['/departments/furnace', '/furnace/new']) {
      await page.goto(base + route);
      await page.getByRole('heading', { level: 1 }).waitFor();
      assert.ok(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
        `Overflow at ${width}: ${route}`,
      );
    }
  }
  console.log('PASS organized furnace list and form fit phone, tablet and desktop');
  const image = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const context = canvas.getContext('2d');
    context.fillStyle = 'white';
    context.fillRect(0, 0, 1200, 800);
    context.fillStyle = 'black';
    context.font = 'bold 48px Arial';
    context.fillText('SPECTRO RESULTS (%)', 70, 80);
    context.font = '56px Arial';
    ['Cu  58.20 %', 'Zn  39.00 %', 'Pb   2.50 %', 'Fe   0.10 %', 'Sn   0.20 %'].forEach(
      (line, index) => context.fillText(line, 100, 210 + index * 110),
    );
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.getByLabel('Upload spectro photo', { exact: true }).setInputFiles({
    name: 'spectro-test.png',
    mimeType: 'image/png',
    buffer: Buffer.from(image, 'base64'),
  });
  await page
    .getByRole('heading', { name: 'Review detected values', exact: true })
    .waitFor({ timeout: 90000 });
  for (const [symbol, expected] of [
    ['Cu', 58.2],
    ['Zn', 39],
    ['Pb', 2.5],
    ['Fe', 0.1],
    ['Sn', 0.2],
  ]) {
    assert.equal(
      Number(await page.getByLabel(`Detected ${symbol} (%)`, { exact: true }).inputValue()),
      expected,
      symbol,
    );
  }
  console.log('PASS real OCR reads all five element percentages from a synthetic report image');
  await page.getByLabel('Detected Zn (%)', { exact: true }).fill('45');
  assert.ok(await page.getByRole('button', { name: /Apply 5 values/ }).isDisabled());
  await page.getByLabel('Detected Zn (%)', { exact: true }).fill('39');
  await page.getByRole('button', { name: /Apply 5 values/ }).click();
  assert.equal(await page.locator('#cu').inputValue(), '58.2');
  assert.equal(await page.locator('#zn').inputValue(), '39');
  assert.equal(await page.getByLabel('Balance Zn automatically').isChecked(), false);
  console.log('PASS reviewed values apply to the form; impossible totals are blocked');
  await page.getByLabel('Heat number', { exact: false }).fill('OCR-PHONE-QA');
  await page.getByLabel('Weight (kg)', { exact: false }).first().fill('500');
  await page
    .getByLabel('Target grade', { exact: false })
    .selectOption('Free Cutting IS 319 / CZ121');
  await page.getByRole('button', { name: 'Save record', exact: true }).click();
  await page.waitForURL(/\/furnace\/[a-f0-9-]{36}$/);
  console.log('PASS scanned heat saves successfully over a LAN HTTP connection');
  await page.goto(base + '/furnace/new');
  await page.getByLabel('Upload spectro photo', { exact: true }).setInputFiles({
    name: 'unsafe.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg/>'),
  });
  await page.getByRole('alert').filter({ hasText: 'JPG, PNG or WebP' }).waitFor();
  assert.equal(await page.locator('#cu').inputValue(), '58');
  console.log('PASS unsupported photo types leave manual values intact');
  await page.getByLabel('Upload spectro photo', { exact: true }).setInputFiles({
    name: 'cancel-test.png',
    mimeType: 'image/png',
    buffer: Buffer.from(image, 'base64'),
  });
  await page.getByRole('button', { name: 'Cancel scan', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Scan cancelled' }).waitFor();
  assert.equal(await page.locator('#cu').inputValue(), '58');
  console.log('PASS cancelling a scan preserves existing manual values');
  assert.deepEqual(external, []);
  assert.deepEqual(uploads, []);
  assert.deepEqual(errors, []);
  console.log('PASS photo scanning makes no external requests or HTTP uploads');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + '/departments/furnace');
  await page.locator('article').first().scrollIntoViewIfNeeded();
  mkdirSync('.tools', { recursive: true });
  await page.screenshot({ path: '.tools/furnace-phone.png' });
} catch (error) {
  if (page) console.error((await page.locator('body').innerText()).slice(-10000));
  throw error;
} finally {
  await browser?.close();
  server.kill();
}
