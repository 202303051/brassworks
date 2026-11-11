import assert from 'node:assert/strict';
import test from 'node:test';
import {
  csvCell,
  csvContent,
  displayDate,
  factoryToday,
  heatNumber,
  inventory,
  meltingMinutes,
  mutateState,
  newRecordId,
  planActual,
  queryRecords,
  recovery,
  schemas,
  shiftDate,
  sizeLabel,
  stockKey,
  totalCharge,
  validateState,
  zincBalance,
} from '../src/features/factory/model.js';
import { seedState } from '../src/features/factory/seed.js';

const NOW = '2026-11-11T10:00:00.000Z';
const seed = () => seedState(NOW);
const payload = (row) => {
  const { id, createdAt, updatedAt, recordVersion, ...value } = row;
  return value;
};
const apply = (state, entity, value, id) =>
  mutateState(state, { type: 'save', entity, payload: value, id }, NOW, () => 'new-record');
const output = (state) => payload(state.outputs[0]);

test('stale edits are rejected even when timestamps are identical', () => {
  const state = seed();
  const row = state.heats[0];
  const action = {
    type: 'save',
    entity: 'heats',
    id: row.id,
    expectedVersion: 1,
    payload: payload(row),
  };
  const first = mutateState(state, action, NOW).state;
  assert.equal(first.heats[0].recordVersion, 2);
  assert.throws(() => mutateState(first, action, NOW), /changed in another tab/);
});

test('phone HTTP preview generates a version-4 UUID without randomUUID', () => {
  const random = { getRandomValues: (bytes) => bytes.fill(0) };
  assert.equal(newRecordId(random), '00000000-0000-4000-8000-000000000000');
});

test('phone HTTP preview keeps secure UUIDs unique and rejects missing crypto', () => {
  const random = { getRandomValues: (bytes) => crypto.getRandomValues(bytes) };
  const ids = new Set(Array.from({ length: 100 }, () => newRecordId(random)));
  assert.equal(ids.size, 100);
  for (const id of ids)
    assert.match(id, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  assert.throws(() => newRecordId({}), /secure random values/);
});

test('new records receive distinct UUIDs with default creation options', () => {
  const state = seed();
  const action = { type: 'save', entity: 'heats', payload: payload(state.heats[0]) };
  const first = mutateState(state, action);
  const second = mutateState(first.state, action);
  assert.notEqual(first.value.id, second.value.id);
  assert.match(first.value.id, /^[a-f0-9-]{36}$/);
});

for (const [start, end, expected] of [
  ['07:30', '10:15', 165],
  ['23:10', '01:35', 145],
  ['00:00', '00:00', 0],
  ['23:59', '00:00', 1],
  ['00:00', '23:59', 1439],
  ['25:00', '01:00', null],
  ['', '', null],
]) {
  test('melting time ' + start + ' → ' + end, () =>
    assert.equal(meltingMinutes(start, end), expected),
  );
}

test('charge totals handle decimal weights', () => {
  assert.equal(totalCharge([{ kg: 0.1 }, { kg: 0.2 }, { kg: '12.345' }]), 12.645);
  assert.equal(totalCharge([]), 0);
  assert.equal(totalCharge([{ kg: '' }]), 0);
});
test('zinc balances all other elements and identifies impossible chemistry', () => {
  assert.equal(zincBalance({ cu: 58, pb: 2.5, fe: 0.1, sn: 0.4 }), 39);
  assert.equal(zincBalance({ cu: 101 }), -1);
  assert.equal(zincBalance({}), 100);
});
test('recovery is weight-based and handles empty denominator', () => {
  assert.equal(recovery(95, 5), 95);
  assert.equal(recovery(30, 0), 100);
  assert.equal(recovery(0, 0), 0);
  assert.equal(recovery(1, 2), 33.33);
});
test('IST date boundaries are independent of host timezone', () => {
  assert.equal(factoryToday('2026-11-11T18:29:59Z'), '2026-11-11');
  assert.equal(factoryToday('2026-11-11T18:30:00Z'), '2026-11-12');
  assert.equal(shiftDate('2024-03-01', -1), '2024-02-29');
  assert.equal(shiftDate('2026-12-31', 1), '2027-01-01');
  assert.equal(displayDate('2026-11-11'), '11/11/2026');
  assert.equal(displayDate('not a date'), '—');
});
test('sample workspace is internally consistent and has every status and shape', () => {
  const state = seed();
  assert.doesNotThrow(() => validateState(state));
  for (const entity of Object.keys(schemas))
    for (const row of state[entity])
      assert.ok(schemas[entity].safeParse(payload(row)).success, entity);
  assert.equal(new Set(state.plans.map((p) => p.rodType)).size, 4);
  assert.equal(new Set(state.plans.map((p) => p.status)).size, 3);
  assert.equal(new Set(state.heats.map((p) => p.status)).size, 2);
});
test('stock received minus production consumption is exact', () => {
  const state = seed();
  const group = inventory(state, '2026-11-11')[0];
  assert.equal(group.available, group.received - group.used);
  assert.equal(
    inventory(state).reduce((s, g) => s + g.available, 0),
    378,
  );
});
test('company, grade and size each form part of the stock key', () => {
  assert.notEqual(stockKey('A', 'G', 'S'), stockKey('B', 'G', 'S'));
  assert.notEqual(stockKey('A', 'G', 'S'), stockKey('A', 'H', 'S'));
  assert.notEqual(stockKey('A', 'G', 'S'), stockKey('A', 'G', 'T'));
  assert.notEqual(stockKey('A|B', 'C', 'D'), stockKey('A', 'B|C', 'D'));
});
test('multiple receipts aggregate into one stock group', () => {
  const state = seed();
  state.billets.push({ ...state.billets[0], id: 'second', count: 5 });
  const group = inventory(state, '2026-11-11').find((g) => g.key === state.outputs[0].stockKey);
  assert.equal(group.received, 29);
  assert.equal(group.available, 21);
  assert.equal(group.today, 29);
});
test('creating production consumes stock and leaves original state unchanged', () => {
  const state = seed();
  const before = structuredClone(state);
  const result = apply(state, 'outputs', { ...output(state), billetsUsed: 2 });
  assert.equal(result.value.id, 'new-record');
  assert.equal(result.value.createdAt, NOW);
  assert.equal(result.state.revision, 1);
  assert.deepEqual(state, before);
  const key = state.outputs[0].stockKey;
  assert.equal(
    inventory(result.state).find((g) => g.key === key).available,
    inventory(state).find((g) => g.key === key).available - 2,
  );
});
test('consuming exactly available stock is allowed; one extra is rejected', () => {
  const state = seed();
  const available = inventory(state).find((g) => g.key === state.outputs[0].stockKey).available;
  const full = apply(state, 'outputs', { ...output(state), billetsUsed: available }).state;
  assert.equal(inventory(full).find((g) => g.key === state.outputs[0].stockKey).available, 0);
  assert.throws(() => apply(full, 'outputs', { ...output(state), billetsUsed: 1 }), /negative/);
});
test('editing output releases its old consumption before applying the new count', () => {
  const state = seed();
  const row = state.outputs[0];
  const before = inventory(state).find((g) => g.key === row.stockKey).available;
  const result = apply(state, 'outputs', { ...output(state), billetsUsed: 3 }, row.id);
  assert.equal(result.state.outputs.length, state.outputs.length);
  assert.equal(
    inventory(result.state).find((g) => g.key === row.stockKey).available,
    before + row.billetsUsed - 3,
  );
  assert.equal(result.value.createdAt, row.createdAt);
});
test('editing output into another group validates both groups', () => {
  const state = seed();
  const original = state.outputs[0];
  const other = state.outputs[1];
  const result = apply(state, 'outputs', { ...payload(other), billetsUsed: 1 }, original.id).state;
  assert.equal(inventory(result).find((g) => g.key === original.stockKey).available, 24);
  assert.equal(inventory(result).find((g) => g.key === other.stockKey).used, other.billetsUsed + 1);
});
test('deleting output restores stock', () => {
  const state = seed();
  const row = state.outputs[0];
  const result = mutateState(state, { type: 'delete', entity: 'outputs', id: row.id }).state;
  assert.equal(inventory(result).find((g) => g.key === row.stockKey).available, 24);
});
test('editing a receipt below consumed quantity is rejected without changing state', () => {
  const state = seed();
  const original = JSON.stringify(state);
  assert.throws(
    () => apply(state, 'billets', { ...payload(state.billets[0]), count: 1 }, state.billets[0].id),
    /negative/,
  );
  assert.equal(JSON.stringify(state), original);
});
test('deleting consumed stock is blocked', () => {
  const state = seed();
  assert.throws(
    () => mutateState(state, { type: 'delete', entity: 'billets', id: state.billets[0].id }),
    /stock/,
  );
});
test('unused billet receipt can be deleted', () => {
  const state = seed();
  const result = mutateState(state, {
    type: 'delete',
    entity: 'billets',
    id: state.billets.at(-1).id,
  }).state;
  assert.equal(result.billets.length, state.billets.length - 1);
});
test('heat deletion is blocked while billets refer to it', () => {
  const state = seed();
  assert.throws(
    () => mutateState(state, { type: 'delete', entity: 'heats', id: state.heats[0].id }),
    /heat is used/,
  );
});
test('plan deletion and company changes are blocked while production refers to them', () => {
  const state = seed();
  assert.throws(
    () => mutateState(state, { type: 'delete', entity: 'plans', id: state.plans[0].id }),
    /plan has production/,
  );
  assert.throws(
    () =>
      apply(state, 'plans', { ...payload(state.plans[0]), company: 'Other' }, state.plans[0].id),
    /Company or grade/,
  );
});
test('output stock must match the company and grade', () => {
  const state = seed();
  assert.throws(
    () => apply(state, 'outputs', { ...output(state), company: 'Other' }),
    /must match/,
  );
  assert.throws(
    () => apply(state, 'outputs', { ...output(state), planId: 'missing' }),
    /plan has production/,
  );
});
test('manual billet source needs a custom heat number', () => {
  const row = payload(seed().billets[0]);
  assert.equal(
    schemas.billets.safeParse({ ...row, heatId: null, customHeatNo: '' }).success,
    false,
  );
  assert.equal(
    schemas.billets.safeParse({ ...row, heatId: null, customHeatNo: 'EXT-1' }).success,
    true,
  );
});
test('all four entities create and edit complete records', () => {
  for (const entity of Object.keys(schemas)) {
    const state = seed();
    const row = payload(state[entity].at(-1));
    const created = apply(state, entity, row);
    assert.equal(created.state[entity].length, state[entity].length + 1);
    const edited = apply(created.state, entity, row, 'new-record');
    assert.equal(edited.state[entity].length, created.state[entity].length);
  }
});
test('unreferenced heat and plan can be deleted', () => {
  const state = seed();
  const unusedPlan = state.plans.at(-1);
  const a = mutateState(state, { type: 'delete', entity: 'plans', id: unusedPlan.id }).state;
  const b = mutateState(a, { type: 'delete', entity: 'billets', id: a.billets.at(-1).id }).state;
  const c = mutateState(b, { type: 'delete', entity: 'heats', id: b.heats.at(-1).id }).state;
  assert.equal(c.heats.length, 11);
});
test('status changes persist and invalid transitions are rejected', () => {
  const state = seed();
  const result = mutateState(
    state,
    { type: 'status', entity: 'plans', id: state.plans[0].id, status: 'Completed' },
    NOW,
  );
  assert.equal(result.value.status, 'Completed');
  assert.throws(() =>
    mutateState(state, {
      type: 'status',
      entity: 'plans',
      id: state.plans[0].id,
      status: 'Unknown',
    }),
  );
  assert.throws(
    () =>
      mutateState(state, {
        type: 'status',
        entity: 'heats',
        id: state.heats[0].id,
        status: 'Pass',
      }),
    /Unknown action/,
  );
});
test('unknown, stale and malformed actions are rejected', () => {
  const state = seed();
  for (const action of [
    null,
    {},
    { type: 'save', entity: '__proto__' },
    { type: 'oops', entity: 'heats' },
    { type: 'delete', entity: 'heats', id: 'gone' },
    { type: 'status', entity: 'plans', id: 'gone', status: 'Completed' },
  ])
    assert.throws(() => mutateState(state, action));
  assert.throws(() => apply(state, 'heats', payload(state.heats[0]), 'gone'), /no longer exists/);
});
test('master additions persist and duplicate spellings use the original option', () => {
  const state = seed();
  const result = mutateState(state, {
    type: 'master',
    kind: 'companies',
    value: '  नयी कंपनी 😀  ',
  });
  assert.ok(result.state.masters.companies.includes('नयी कंपनी 😀'));
  const duplicate = mutateState(state, {
    type: 'master',
    kind: 'companies',
    value: 'jamnagar precision components',
  });
  assert.equal(duplicate.value, state.masters.companies[0]);
  assert.equal(duplicate.state, state);
});
test('invalid master options and prototype keys are rejected', () => {
  const state = seed();
  for (const action of [
    { kind: '__proto__', value: 'bad' },
    { kind: 'rodSizes', value: 'none' },
    { kind: 'rodSizes', value: '-1' },
    { kind: 'rodSizes', value: '100001' },
    { kind: 'companies', value: '__add_new__' },
    { kind: 'companies', value: 'x'.repeat(101) },
    { kind: 'companies', value: 'a\nb' },
  ])
    assert.throws(() => mutateState(state, { type: 'master', ...action }));
});
test('weights, counts, empty numeric values and invalid dates are rejected', () => {
  const state = seed();
  for (const count of [-1, 0, 1.5, 1000001, '', ' '])
    assert.equal(schemas.billets.safeParse({ ...payload(state.billets[0]), count }).success, false);
  for (const totalKg of [-1, 0, '', 1000001, Infinity])
    assert.equal(
      schemas.billets.safeParse({ ...payload(state.billets[0]), totalKg }).success,
      false,
    );
  for (const date of ['2026-02-30', '2025-02-29', '2026-13-01', ''])
    assert.equal(schemas.billets.safeParse({ ...payload(state.billets[0]), date }).success, false);
});
test('spectro total, automatic balance and missing percentages are validated', () => {
  const row = payload(seed().heats[0]);
  for (const changes of [
    { cu: 101 },
    { cu: -1 },
    { cu: '' },
    { autoZn: false, zn: 99 },
    { zn: 0 },
    { readyTime: row.startTime },
    { materials: [] },
    { materials: [{ material: 'Lead', kg: -1 }] },
  ])
    assert.equal(schemas.heats.safeParse({ ...row, ...changes }).success, false);
  assert.equal(schemas.heats.safeParse({ ...row, autoZn: false, zn: 0 }).success, true);
});
test('hollow, round and polygon dimensions are validated', () => {
  const row = payload(seed().plans[3]);
  for (const changes of [
    { innerMm: 0 },
    { innerMm: row.outerMm },
    { innerMm: -1 },
    { rodType: 'Round' },
    { rodType: 'Hexa', innerMm: 0 },
    { dimension: 'Across flats' },
  ])
    assert.equal(schemas.plans.safeParse({ ...row, ...changes }).success, false);
  assert.equal(
    schemas.plans.safeParse({ ...row, dimension: 'Radius', innerMm: row.outerMm + 1 }).success,
    true,
  );
  assert.equal(schemas.plans.safeParse({ ...row, rodType: 'Round', innerMm: 0 }).success, true);
});
test('unknown fields cannot be smuggled into a record', () => {
  const row = payload(seed().plans[0]);
  assert.equal(schemas.plans.safeParse({ ...row, role: 'Admin' }).success, false);
});
test('queries filter by today, yesterday and custom date ranges', () => {
  const state = seed();
  assert.equal(queryRecords(state, 'heats', { date: 'today' }, '2026-11-11').length, 5);
  assert.equal(queryRecords(state, 'heats', { date: 'yesterday' }, '2026-11-11').length, 4);
  assert.equal(
    queryRecords(state, 'heats', { date: 'custom', from: '2026-11-10', to: '2026-11-10' }).length,
    4,
  );
  assert.equal(queryRecords(state, 'heats', { date: 'custom', from: '2026-11-12' }).length, 0);
  assert.equal(queryRecords(state, 'heats', { date: 'custom', to: '2026-11-08' }).length, 3);
});
test('queries search heat, company, grade, size, shape and order', () => {
  const state = seed();
  assert.equal(queryRecords(state, 'heats', { q: state.heats[0].heatNo }).length, 1);
  assert.equal(queryRecords(state, 'billets', { q: state.heats[0].heatNo }).length, 1);
  for (const q of ['jamnagar', 'CZ121', '100mm'])
    assert.ok(queryRecords(state, 'billets', { q }).length > 0);
  for (const q of ['ORD-2041', 'Round', '3000 × 25'])
    assert.ok(queryRecords(state, 'plans', { q }).length > 0);
  assert.equal(queryRecords(state, 'plans', { q: 'missing 😀' }).length, 0);
});
test('queries combine exact filters without mutating the source', () => {
  const state = seed();
  const before = JSON.stringify(state);
  const row = state.plans[0];
  assert.equal(
    queryRecords(state, 'plans', {
      company: row.company,
      grade: row.grade,
      rodType: row.rodType,
      status: row.status,
    }).length,
    1,
  );
  assert.ok(
    queryRecords(state, 'billets', { size: state.billets[0].size }).every(
      (r) => r.size === state.billets[0].size,
    ),
  );
  assert.equal(JSON.stringify(state), before);
});
test('numeric and computed columns sort correctly', () => {
  const state = seed();
  assert.equal(queryRecords(state, 'billets', { sort: 'count', dir: 'asc' })[0].count, 24);
  assert.equal(queryRecords(state, 'billets', { sort: 'count', dir: 'desc' })[0].count, 57);
  const charges = queryRecords(state, 'heats', { sort: 'chargeKg', dir: 'asc' });
  assert.ok(totalCharge(charges[0].materials) <= totalCharge(charges.at(-1).materials));
  const melts = queryRecords(state, 'heats', { sort: 'meltMinutes', dir: 'asc' });
  assert.equal(meltingMinutes(melts[0].startTime, melts[0].readyTime), 145);
  assert.equal(queryRecords(state, 'heats', { sort: 'not-a-field' }).length, 12);
  assert.deepEqual(queryRecords(state, 'unknown', {}), []);
});
test('display helpers resolve linked and custom heats and rod dimensions', () => {
  const state = seed();
  assert.equal(heatNumber(state.billets[0], state), state.heats[0].heatNo);
  assert.equal(heatNumber({ heatId: 'gone' }, state), 'Missing heat');
  assert.equal(heatNumber({ customHeatNo: 'CUSTOM' }, state), 'CUSTOM');
  assert.equal(heatNumber({}, state), '—');
  assert.match(sizeLabel(state.plans[3]), /ID 18/);
  assert.doesNotMatch(sizeLabel(state.plans[0]), /ID/);
  assert.equal(planActual(state, state.plans[0].id), state.outputs[0].actualKg);
  assert.equal(planActual(state, 'none'), 0);
});
test('CSV quoting protects formula-leading text and preserves Unicode', () => {
  for (const value of ['=1+1', '+CMD', '-1+2', '@SUM(A1)', '  =1', '\ttext', '\rtext'])
    assert.ok(csvCell(value).startsWith('"\''));
  assert.equal(csvCell('a"b'), '"a""b"');
  assert.equal(csvCell(null), '""');
  assert.equal(csvCell('कंपनी 😀'), '"कंपनी 😀"');
  assert.equal(csvContent(['Name'], [['a'], ['b']]), '\uFEFF"Name"\r\n"a"\r\n"b"');
});
