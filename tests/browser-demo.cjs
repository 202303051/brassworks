const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');

const base = process.env.APP_BASE_URL || 'http://localhost:4173';
const hostname = new URL(base).hostname;
if (!['localhost', '127.0.0.1', 'preview--peak-brassworks-factory.apper.so'].includes(hostname)) {
  throw new Error('Run this test only against the owned Brassworks local demo or preview.');
}
const GRADE = 'Free Cutting IS 319 / CZ121';
const COMPANY = 'Jamnagar Precision Components';
const SIZE = '100mm × 600mm';
const KEY = JSON.stringify([COMPANY, GRADE, SIZE]);
const HEAT = 'QA-HEAT-TEST';
const ORDER = 'QA-ORDER-TEST';
const checks = [];

async function workspace(page) {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('brassworks-phase1-demo', 1);
        open.onerror = () => reject(new Error('Cannot inspect the local demo workspace'));
        open.onsuccess = () => {
          const db = open.result;
          const request = db
            .transaction('workspace', 'readonly')
            .objectStore('workspace')
            .get('current');
          request.onsuccess = () => {
            resolve(request.result);
            db.close();
          };
          request.onerror = () => {
            reject(request.error);
            db.close();
          };
        };
      }),
  );
}
const available = (state, key = KEY) =>
  state.billets
    .filter((r) => JSON.stringify([r.company, r.grade, r.size]) === key)
    .reduce((s, r) => s + r.count, 0) -
  state.outputs.filter((r) => r.stockKey === key).reduce((s, r) => s + r.billetsUsed, 0);
async function check(name, run) {
  await run();
  checks.push(name);
  console.log('PASS ' + name);
}
async function go(page, path) {
  await page.goto(base + path, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { level: 1 }).waitFor();
}
async function deleteCurrent(page) {
  await page.getByRole('button', { name: /^Delete / }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Delete record', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
}
async function newHeat(page, name = HEAT) {
  await go(page, '/furnace/new');
  await page.getByLabel('Heat number', { exact: false }).fill(name);
  await page.getByLabel('Weight (kg)', { exact: false }).fill('125');
  await page.getByLabel('Target grade', { exact: false }).selectOption(GRADE);
}
async function fillOutput(page, planId, count) {
  await go(page, '/output/new');
  await page.getByLabel('Planned order', { exact: true }).selectOption(planId);
  await page.getByLabel('Billet stock group', { exact: false }).selectOption(KEY);
  await page.getByLabel('Billets used', { exact: false }).fill(String(count));
  await page.getByLabel('Actual rod produced', { exact: false }).fill('144');
  await page.getByLabel('Scrap / butt weight', { exact: false }).fill('16');
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    headless: true,
    args: ['--no-sandbox'],
    proxy: process.env.HTTPS_PROXY
      ? { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' }
      : undefined,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: 'en-IN',
    timezoneId: 'America/New_York',
    acceptDownloads: true,
  });
  if (process.env.HTTPS_PROXY) {
    await context.route('**/*', async (route) => {
      if (['localhost', '127.0.0.1'].includes(new URL(route.request().url()).hostname))
        return route.continue();
      try {
        await route.fulfill({ response: await context.request.fetch(route.request()) });
      } catch {
        await route.abort();
      }
    });
  }
  const page = await context.newPage();
  const errors = [];
  const dialogs = [];
  context.on('page', (tab) => tab.on('pageerror', (error) => errors.push(error.message)));
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('dialog', async (dialog) => {
    dialogs.push(dialog.type());
    await dialog.dismiss();
  });
  let heat;
  let billet;
  let plan;
  let output;
  try {
    await check('home loads demo without login and displays IST', async () => {
      await go(page, '/');
      await page.getByText('378', { exact: true }).waitFor();
      assert.match(await page.locator('time').innerText(), /IST/);
      assert.equal((await workspace(page)).heats.length, 12);
    });
    await check('keyboard skip link reaches main content', async () => {
      await page.keyboard.press('Tab');
      assert.equal(await page.locator(':focus').innerText(), 'Skip to content');
      await page.keyboard.press('Enter');
      assert.equal(await page.locator(':focus').getAttribute('id'), 'main-content');
    });
    await check('heat creation includes overnight timing and multiple charge rows', async () => {
      await newHeat(page);
      await page.getByLabel('Heat start time', { exact: false }).fill('23:30');
      await page.getByLabel('Full liquid ready', { exact: false }).fill('01:00');
      await page.getByRole('button', { name: '+ Add material', exact: true }).click();
      await page.locator('#material-1').selectOption('Zinc');
      await page.locator('#weight-1').fill('25');
      await page.getByRole('button', { name: 'Save record', exact: true }).click();
      await page.getByRole('heading', { name: HEAT, exact: true }).waitFor();
      heat = (await workspace(page)).heats.find((r) => r.heatNo === HEAT);
      assert.equal(heat.materials.length, 2);
      assert.equal(
        heat.materials.reduce((s, r) => s + r.kg, 0),
        150,
      );
      await page.getByText('1h 30m', { exact: true }).waitFor();
    });
    await check('heat edit and reload preserve saved values', async () => {
      await page.getByRole('link', { name: 'Edit', exact: true }).click();
      await page.getByLabel('Furnace number', { exact: false }).fill('F-9');
      await page.getByRole('button', { name: 'Save changes', exact: true }).click();
      await page.getByText('F-9', { exact: true }).waitFor();
      await page.reload();
      await page.getByText('F-9', { exact: true }).waitFor();
    });
    await check('duplicate heat numbers require confirmation', async () => {
      await newHeat(page);
      await page.getByRole('button', { name: 'Save record', exact: true }).click();
      await page
        .getByText('Confirm the duplicate heat number before saving.', { exact: true })
        .first()
        .waitFor();
      assert.equal((await workspace(page)).heats.length, 13);
      await page.getByLabel(/I confirm this is a separate heat/).check();
      await page.getByRole('button', { name: 'Save record', exact: true }).click();
      await page.getByRole('heading', { name: HEAT, exact: true }).waitFor();
      assert.equal((await workspace(page)).heats.length, 14);
      await deleteCurrent(page);
      assert.equal((await workspace(page)).heats.length, 13);
    });
    await check('billet receipt links heat and increases grouped availability', async () => {
      const before = available(await workspace(page));
      await go(page, '/billets/new');
      await page.getByLabel('Linked heat', { exact: true }).selectOption(heat.id);
      await page.getByLabel('Company', { exact: false }).selectOption(COMPANY);
      await page.getByLabel('Brass grade', { exact: false }).selectOption(GRADE);
      await page.getByLabel('Billet size', { exact: false }).selectOption(SIZE);
      await page.getByLabel('Number of billets', { exact: false }).fill('5');
      await page.getByLabel('Total weight', { exact: false }).fill('200');
      await page.getByRole('button', { name: 'Save record', exact: true }).click();
      await page.getByRole('heading', { name: /Jamnagar Precision Components/ }).waitFor();
      billet = (await workspace(page)).billets.find((r) => r.heatId === heat.id);
      assert.equal(available(await workspace(page)), before + 5);
    });
    await check('billet edit replaces its receipt quantity', async () => {
      const before = available(await workspace(page));
      await page.getByRole('link', { name: 'Edit', exact: true }).click();
      await page.getByLabel('Number of billets', { exact: false }).fill('7');
      await page.getByRole('button', { name: 'Save changes', exact: true }).click();
      await page.getByText('7', { exact: true }).first().waitFor();
      assert.equal(available(await workspace(page)), before + 2);
    });
    await check('hollow rod plan stores all three form sections', async () => {
      await go(page, '/plans/new');
      await page.getByLabel('Brass grade', { exact: false }).selectOption(GRADE);
      await page.getByLabel('Rod type', { exact: false }).selectOption('Hollow');
      await page.getByLabel('Outer size', { exact: false }).selectOption('40');
      await page.getByLabel('Inner diameter', { exact: false }).fill('20');
      await page.getByLabel('Planned weight', { exact: false }).fill('500');
      await page.getByLabel('Company', { exact: false }).selectOption(COMPANY);
      await page.getByLabel('Order name', { exact: false }).fill(ORDER);
      await page.getByLabel('Priority', { exact: false }).selectOption('Urgent');
      await page.getByRole('button', { name: 'Save record', exact: true }).click();
      await page.getByRole('heading', { name: ORDER, exact: true }).waitFor();
      plan = (await workspace(page)).plans.find((r) => r.orderName === ORDER);
      assert.equal(plan.innerMm, 20);
      assert.equal(plan.plannedKg, 500);
    });
    await check('plan status cycle persists and confirms completion', async () => {
      await page
        .getByRole('button', { name: 'Move ' + ORDER + ' to In Production', exact: true })
        .click();
      await page
        .getByRole('button', { name: 'Move ' + ORDER + ' to Completed', exact: true })
        .click();
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Mark completed', exact: true })
        .click();
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
      assert.equal((await workspace(page)).plans.find((r) => r.id === plan.id).status, 'Completed');
    });
    await check('plan edit saves changed target and keeps dimensions', async () => {
      await page.getByRole('link', { name: 'Edit', exact: true }).click();
      await page.getByLabel('Planned weight', { exact: false }).fill('510');
      await page.getByRole('button', { name: 'Save changes', exact: true }).click();
      await page.getByRole('heading', { name: ORDER, exact: true }).waitFor();
      assert.equal((await workspace(page)).plans.find((r) => r.id === plan.id).plannedKg, 510);
    });
    await check('finished production consumes matching billet stock', async () => {
      const before = available(await workspace(page));
      await fillOutput(page, plan.id, 4);
      await page.getByRole('button', { name: 'Save record', exact: true }).click();
      await page.getByRole('heading', { name: /Jamnagar Precision Components/ }).waitFor();
      output = (await workspace(page)).outputs.find((r) => r.planId === plan.id);
      assert.equal(available(await workspace(page)), before - 4);
      await page.getByText('90', { exact: false }).first().waitFor();
    });
    await check(
      'editing production releases old stock before applying new consumption',
      async () => {
        const before = available(await workspace(page));
        await page.getByRole('link', { name: 'Edit', exact: true }).click();
        await page.getByLabel('Billets used', { exact: false }).fill('3');
        await page.getByLabel('Actual rod produced', { exact: false }).fill('135');
        await page.getByLabel('Scrap / butt weight', { exact: false }).fill('15');
        await page.getByRole('button', { name: 'Save changes', exact: true }).click();
        await page.getByRole('heading', { name: /Jamnagar Precision Components/ }).waitFor();
        assert.equal(available(await workspace(page)), before + 1);
      },
    );
    await check('consumed receipts and linked heat/plan deletion are blocked', async () => {
      for (const path of ['/billets/billet-1', '/furnace/' + heat.id, '/plans/' + plan.id]) {
        await go(page, path);
        await page.getByRole('button', { name: /^Delete / }).click();
        const dialog = page.getByRole('dialog');
        await dialog.getByRole('button', { name: 'Delete record', exact: true }).click();
        await page.waitForTimeout(150);
        assert.equal(await dialog.isVisible(), true);
        await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
      }
      assert.ok((await workspace(page)).heats.some((r) => r.id === heat.id));
      assert.ok((await workspace(page)).plans.some((r) => r.id === plan.id));
    });
    await check('stale forms cannot overwrite a change from another tab', async () => {
      await go(page, '/plans/' + plan.id + '/edit');
      await page.getByLabel('Planned weight', { exact: false }).fill('600');
      const other = await context.newPage();
      await go(other, '/plans/' + plan.id);
      await other
        .getByRole('button', { name: 'Move ' + ORDER + ' to Planned', exact: true })
        .click();
      await other
        .getByRole('dialog')
        .getByRole('button', { name: 'Reopen plan', exact: true })
        .click();
      await other.getByRole('dialog').waitFor({ state: 'hidden' });
      await page.getByRole('button', { name: 'Save changes', exact: true }).click();
      await page
        .getByText(/This record changed in another tab/)
        .first()
        .waitFor();
      assert.equal((await workspace(page)).plans.find((r) => r.id === plan.id).plannedKg, 510);
      assert.equal(await page.getByLabel('Planned weight', { exact: false }).inputValue(), '600');
      await other.close();
    });
    await check('over-consumption is rejected without a partial write', async () => {
      const before = await workspace(page);
      await fillOutput(page, plan.id, 1000000);
      await page.getByRole('button', { name: 'Save record', exact: true }).click();
      await page
        .getByText(/Not enough billets for/)
        .first()
        .waitFor();
      assert.equal((await workspace(page)).outputs.length, before.outputs.length);
      assert.equal(available(await workspace(page)), available(before));
    });
    await check('concurrent tabs cannot consume the same remaining billets twice', async () => {
      const before = await workspace(page);
      const other = await context.newPage();
      await fillOutput(page, plan.id, available(before));
      await fillOutput(other, plan.id, available(before));
      await Promise.all([
        page.getByRole('button', { name: 'Save record', exact: true }).click(),
        other.getByRole('button', { name: 'Save record', exact: true }).click(),
      ]);
      for (let i = 0; i < 30; i += 1) {
        if ((await workspace(page)).outputs.length === before.outputs.length + 1) break;
        await page.waitForTimeout(100);
      }
      const after = await workspace(page);
      assert.equal(after.outputs.length, before.outputs.length + 1);
      assert.equal(available(after), 0);
      const winner = page.url().endsWith('/output/new') ? other : page;
      await winner.getByRole('heading', { name: /Jamnagar Precision Components/ }).waitFor();
      await deleteCurrent(winner);
      assert.equal(available(await workspace(page)), available(before));
      await other.close();
    });
    await check('deleting finished production restores its consumed billets', async () => {
      const before = available(await workspace(page));
      await go(page, '/output/' + output.id);
      await deleteCurrent(page);
      assert.equal(available(await workspace(page)), before + 3);
    });
    await check('invalid chemistry, weights and hollow dimensions stay unsaved', async () => {
      const before = await workspace(page);
      await newHeat(page, 'INVALID');
      await page.getByLabel('Balance Zn automatically').uncheck();
      await page.getByLabel('Cu (%)', { exact: false }).fill('95');
      await page.getByLabel('Zn (%)', { exact: false }).fill('20');
      await page.getByRole('button', { name: 'Save record', exact: true }).click();
      await page.getByText('Spectro percentages cannot exceed 100%', { exact: true }).waitFor();
      assert.equal((await workspace(page)).heats.length, before.heats.length);
      await page.getByLabel('Weight (kg)', { exact: false }).fill('-1');
      await page.getByRole('button', { name: 'Save record', exact: true }).click();
      await page.getByText('Enter a weight greater than zero', { exact: true }).waitFor();
      await go(page, '/plans/new');
      await page.getByLabel('Brass grade', { exact: false }).selectOption(GRADE);
      await page.getByLabel('Rod type', { exact: false }).selectOption('Hollow');
      await page.getByLabel('Outer size', { exact: false }).selectOption('40');
      await page.getByLabel('Inner diameter', { exact: false }).fill('40');
      await page.getByLabel('Planned weight', { exact: false }).fill('100');
      await page.getByLabel('Company', { exact: false }).selectOption(COMPANY);
      await page.getByLabel('Order name', { exact: false }).fill('INVALID-HOLLOW');
      await page.getByRole('button', { name: 'Save record', exact: true }).click();
      await page
        .getByText('Inner diameter must be positive and smaller than the outer diameter', {
          exact: true,
        })
        .waitFor();
      assert.equal((await workspace(page)).plans.length, before.plans.length);
    });
    await check(
      'search, date filters, sorting, pagination and CSV reflect the same rows',
      async () => {
        await go(page, '/departments/furnace');
        await page.getByLabel('Date filter', { exact: true }).selectOption('yesterday');
        await page.getByText('4 matching records', { exact: true }).waitFor();
        const pendingDownload = page.waitForEvent('download');
        await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
        const download = await pendingDownload;
        const csv = fs.readFileSync(await download.path(), 'utf8');
        assert.equal(csv.split('\r\n').length, 5);
        assert.ok(csv.includes('Melting minutes'));
        await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
        await page.getByRole('button', { name: 'Next', exact: true }).click();
        await page.getByText('Page 2 of 2', { exact: true }).waitFor();
        await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
        await page.getByLabel('Sort column').selectOption('heatNo');
        await page.getByLabel('Search records').fill(HEAT);
        await page.getByText('1 matching record', { exact: true }).waitFor();
        await page.getByRole('link', { name: HEAT, exact: false }).click();
        await page.getByRole('link', { name: 'Back to Furnace', exact: true }).click();
        assert.ok(page.url().includes('q=QA-HEAT-TEST'));
      },
    );
    await check('print layout contains every filtered record rather than one page', async () => {
      await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
      await page.evaluate(() => {
        window.__printCalled = false;
        window.print = () => {
          window.__printCalled = true;
        };
      });
      await page.getByRole('button', { name: 'Print / PDF', exact: true }).click();
      assert.equal(await page.evaluate(() => window.__printCalled), true);
      await page.emulateMedia({ media: 'print' });
      const printed = page
        .getByRole('heading', { name: 'Brassworks · Furnace', exact: true })
        .locator('..');
      assert.equal(await printed.locator('tbody tr').count(), (await workspace(page)).heats.length);
      const pdf = await page.pdf({ format: 'A4', landscape: true });
      assert.ok(pdf.length > 1000);
      await page.emulateMedia({ media: 'screen' });
    });
    await check(
      'smart master additions are literal text and CSV formulas are escaped',
      async () => {
        await go(page, '/billets/new');
        await page.getByLabel('Custom heat number', { exact: false }).fill('EXTERNAL');
        await page.getByLabel('Company', { exact: false }).selectOption('__add_new__');
        const literal = '<img src=x onerror=alert(1)>';
        await page.locator('#company-new').fill(literal);
        await page.getByRole('button', { name: 'Add option', exact: true }).click();
        await page.getByLabel('Brass grade', { exact: false }).selectOption(GRADE);
        await page.getByLabel('Billet size', { exact: false }).selectOption(SIZE);
        await page.getByLabel('Number of billets', { exact: false }).fill('1');
        await page.getByLabel('Total weight', { exact: false }).fill('10');
        await page.getByRole('button', { name: 'Save record', exact: true }).click();
        await page.getByRole('heading', { name: /<img src=x/ }).waitFor();
        assert.equal(await page.locator('img[src="x"]').count(), 0);
        await page.getByRole('link', { name: 'Edit', exact: true }).click();
        await page.getByLabel('Company', { exact: false }).selectOption('__add_new__');
        await page.locator('#company-new').fill('=1+1');
        await page.getByRole('button', { name: 'Add option', exact: true }).click();
        await page.getByRole('button', { name: 'Save changes', exact: true }).click();
        await page.getByRole('heading', { name: /=1\+1/ }).waitFor();
        await go(page, '/departments/production');
        await page.getByLabel('Search records').fill('=1+1');
        const pending = page.waitForEvent('download');
        await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
        const csv = fs.readFileSync(await (await pending).path(), 'utf8');
        assert.ok(csv.includes('"\'=1+1"'));
        assert.deepEqual(dialogs, []);
        await page.getByRole('link', { name: '=1+1', exact: false }).click();
        await deleteCurrent(page);
        assert.equal(
          (await workspace(page)).billets.some((row) => row.company === '=1+1'),
          false,
        );
      },
    );
    await check('double-tapping Save creates one record', async () => {
      const before = (await workspace(page)).heats.length;
      await newHeat(page, 'QA-DOUBLE-SAVE');
      await page.getByRole('button', { name: 'Save record', exact: true }).dblclick();
      await page.getByRole('heading', { name: 'QA-DOUBLE-SAVE', exact: true }).waitFor();
      assert.equal((await workspace(page)).heats.length, before + 1);
    });
    await check('already-loaded demo forms save while offline', async () => {
      await page.getByRole('link', { name: 'Edit', exact: true }).click();
      await page.getByLabel('Furnace number', { exact: false }).fill('F-OFFLINE');
      await context.setOffline(true);
      await page.getByRole('button', { name: 'Save changes', exact: true }).click();
      await page.getByText('F-OFFLINE', { exact: true }).waitFor();
      await context.setOffline(false);
      await page.reload();
      await page.getByText('F-OFFLINE', { exact: true }).waitFor();
    });
    await check('all lists and forms fit phone and tablet widths', async () => {
      for (const width of [375, 768]) {
        await page.setViewportSize({ width, height: 900 });
        for (const path of [
          '/',
          '/departments/furnace',
          '/departments/production',
          '/production/planning',
          '/production/finished',
          '/furnace/new',
          '/billets/new',
          '/plans/new',
          '/output/new',
        ]) {
          await go(page, path);
          const size = await page.evaluate(() => ({
            width: innerWidth,
            document: document.documentElement.scrollWidth,
          }));
          assert.ok(size.document <= size.width + 1, path + ': ' + JSON.stringify(size));
        }
      }
    });
    await check('light, dark and system theme controls respond', async () => {
      await page.getByRole('button', { name: 'Dark mode', exact: true }).click();
      assert.ok(await page.locator('html').evaluate((node) => node.classList.contains('dark')));
      await page.getByRole('button', { name: 'Light mode', exact: true }).click();
      assert.ok(!(await page.locator('html').evaluate((node) => node.classList.contains('dark'))));
      await page.getByRole('button', { name: 'System theme', exact: true }).click();
    });
    await check('unreferenced plans can be deleted after output removal', async () => {
      await go(page, '/plans/' + plan.id);
      await deleteCurrent(page);
      assert.equal(
        (await workspace(page)).plans.some((row) => row.id === plan.id),
        false,
      );
    });
    await check(
      'reset confirmation restores samples and removes added master options',
      async () => {
        await page.getByRole('button', { name: 'Reset demo', exact: true }).click();
        await page
          .getByRole('dialog')
          .getByRole('button', { name: 'Reset demo data', exact: true })
          .click();
        await page.getByRole('dialog').waitFor({ state: 'hidden' });
        await page.getByRole('heading', { name: /Your factory/ }).waitFor();
        const state = await workspace(page);
        assert.equal(state.heats.length, 12);
        assert.equal(state.billets.length, 12);
        assert.equal(state.plans.length, 12);
        assert.equal(state.outputs.length, 9);
        assert.equal(state.masters.companies.includes('=1+1'), false);
      },
    );
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ total: checks.length, checks, pageErrors: errors }, null, 2));
    if (process.env.RESULT_PATH)
      fs.writeFileSync(
        process.env.RESULT_PATH,
        JSON.stringify({ total: checks.length, checks, pageErrors: errors }, null, 2),
      );
  } catch (error) {
    console.error('Failed at', page.url());
    console.error('Page errors:', JSON.stringify(errors));
    console.error((await page.locator('body').innerText()).slice(-4500));
    throw error;
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
