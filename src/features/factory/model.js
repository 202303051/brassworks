import { z } from 'zod';

export const ROD_TYPES = ['Round', 'Hexa', 'Octa', 'Hollow'];
export const PLAN_STATUSES = ['Planned', 'In Production', 'Completed'];
export const MAX_KG = 1000000;
export const text = z
  .string()
  .trim()
  .min(1, 'Required')
  .max(100, 'Use 100 characters or fewer')
  .refine((v) => !/[\u0000-\u001f\u007f]/.test(v), 'Control characters are not allowed');
export const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date')
  .refine((v) => {
    const d = new Date(v + 'T00:00:00Z');
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, 'Choose a valid calendar date');
const requiredNumber = (schema) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? Number.NaN : value),
    schema,
  );
const kg = requiredNumber(
  z.coerce.number().finite().positive('Enter a weight greater than zero').max(MAX_KG),
);
const dimension = requiredNumber(z.coerce.number().finite().positive().max(100000));
const percent = requiredNumber(z.coerce.number().finite().min(0).max(100));
const count = requiredNumber(z.coerce.number().int('Use a whole number').min(1).max(1000000));
const clock = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'Use a valid time');
const optionalId = z.string().max(100).nullable().default(null);
const heatSchema = z
  .object({
    date,
    shift: z.enum(['Day', 'Night']),
    furnaceNo: text,
    heatNo: text.max(40),
    startTime: clock,
    readyTime: clock,
    materials: z
      .array(z.object({ material: text, kg }).strict())
      .min(1)
      .max(50),
    cu: percent,
    zn: percent,
    pb: percent,
    fe: percent,
    sn: percent,
    autoZn: z.boolean(),
    grade: text,
    status: z.enum(['Pass', 'Correction Done']),
  })
  .strict()
  .superRefine((v, c) => {
    if (v.cu + v.zn + v.pb + v.fe + v.sn > 100.000001)
      c.addIssue({
        code: 'custom',
        path: ['cu'],
        message: 'Spectro percentages cannot exceed 100%',
      });
    if (v.autoZn && Math.abs(v.zn - zincBalance(v)) > 0.000001)
      c.addIssue({
        code: 'custom',
        path: ['zn'],
        message: 'Zinc balance does not match the other elements',
      });
    if (v.startTime === v.readyTime)
      c.addIssue({
        code: 'custom',
        path: ['readyTime'],
        message: 'Ready time must differ from start time',
      });
  });
const billetSchema = z
  .object({
    date,
    heatId: optionalId,
    customHeatNo: z.string().trim().max(40).default(''),
    company: text,
    grade: text,
    size: text,
    count,
    totalKg: kg,
  })
  .strict()
  .superRefine((v, c) => {
    if (!v.heatId && !v.customHeatNo)
      c.addIssue({
        code: 'custom',
        path: ['customHeatNo'],
        message: 'Select a heat or enter a custom heat number',
      });
  });
const dimensions = {
  rodType: z.enum(ROD_TYPES),
  lengthMm: dimension,
  outerMm: dimension,
  innerMm: z.coerce.number().finite().min(0).max(100000),
  dimension: z.enum(['Diameter', 'Radius', 'Across flats']),
};
function checkDimensions(v, c) {
  const diameter = v.dimension === 'Radius' ? v.outerMm * 2 : v.outerMm;
  if (v.rodType === 'Hollow' && (v.innerMm <= 0 || v.innerMm >= diameter))
    c.addIssue({
      code: 'custom',
      path: ['innerMm'],
      message: 'Inner diameter must be positive and smaller than the outer diameter',
    });
  if (v.rodType !== 'Hollow' && v.innerMm !== 0)
    c.addIssue({
      code: 'custom',
      path: ['innerMm'],
      message: 'Only hollow rods have an inner diameter',
    });
  if (['Hexa', 'Octa'].includes(v.rodType) && v.dimension !== 'Across flats')
    c.addIssue({
      code: 'custom',
      path: ['dimension'],
      message: 'Use across flats for Hexa and Octa',
    });
  if (['Round', 'Hollow'].includes(v.rodType) && v.dimension === 'Across flats')
    c.addIssue({
      code: 'custom',
      path: ['dimension'],
      message: 'Choose diameter or radius for this shape',
    });
}
const planSchema = z
  .object({
    date,
    ...dimensions,
    grade: text,
    plannedKg: kg,
    company: text,
    orderName: text,
    priority: z.enum(['Normal', 'Urgent']),
    status: z.enum(PLAN_STATUSES),
  })
  .strict()
  .superRefine(checkDimensions);
const outputSchema = z
  .object({
    date,
    planId: optionalId,
    stockKey: z.string().min(1, 'Choose billet stock').max(400),
    company: text,
    grade: text,
    ...dimensions,
    billetsUsed: count,
    actualKg: kg,
    scrapKg: z.coerce.number().finite().min(0).max(MAX_KG),
  })
  .strict()
  .superRefine(checkDimensions);

export const schemas = Object.freeze({
  heats: heatSchema,
  billets: billetSchema,
  plans: planSchema,
  outputs: outputSchema,
});

export function round(value, decimals = 3) {
  const scale = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * scale) / scale;
}

export function meltingMinutes(start, end) {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(end))
    return null;
  const toMinutes = (v) => Number(v.slice(0, 2)) * 60 + Number(v.slice(3));
  return (toMinutes(end) - toMinutes(start) + 1440) % 1440;
}

export function zincBalance(values) {
  return round(
    100 - ['cu', 'pb', 'fe', 'sn'].reduce((sum, key) => sum + Number(values[key] || 0), 0),
    4,
  );
}

export function totalCharge(materials) {
  return round(materials.reduce((sum, row) => sum + Number(row.kg || 0), 0));
}

export function recovery(actualKg, scrapKg) {
  const denominator = actualKg + scrapKg;
  return denominator > 0 ? round((actualKg / denominator) * 100, 2) : 0;
}

export function factoryToday(instant = new Date().toISOString()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(instant));
  const part = (type) => parts.find((p) => p.type === type).value;
  return part('year') + '-' + part('month') + '-' + part('day');
}

export function shiftDate(value, days) {
  const stamp = new Date(value + 'T12:00:00Z');
  stamp.setUTCDate(stamp.getUTCDate() + days);
  return stamp.toISOString().slice(0, 10);
}

export function displayDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-').reverse().join('/') : '—';
}

export function stockKey(company, grade, size) {
  return JSON.stringify([company, grade, size]);
}

export function inventory(state, today = factoryToday()) {
  const groups = new Map();
  for (const row of state.billets) {
    const key = stockKey(row.company, row.grade, row.size);
    const group = groups.get(key) ?? {
      key,
      company: row.company,
      grade: row.grade,
      size: row.size,
      received: 0,
      today: 0,
      used: 0,
      available: 0,
      totalKg: 0,
    };
    group.received += row.count;
    group.totalKg = round(group.totalKg + row.totalKg);
    if (row.date === today) group.today += row.count;
    groups.set(key, group);
  }
  for (const row of state.outputs) {
    const group = groups.get(row.stockKey);
    if (!group) throw new Error('Production references billet stock that no longer exists.');
    group.used += row.billetsUsed;
  }
  return [...groups.values()]
    .map((g) => ({ ...g, available: g.received - g.used }))
    .sort(
      (a, b) =>
        a.company.localeCompare(b.company) ||
        a.grade.localeCompare(b.grade) ||
        a.size.localeCompare(b.size),
    );
}

export function heatNumber(row, state) {
  return row.heatId
    ? (state.heats.find((h) => h.id === row.heatId)?.heatNo ?? 'Missing heat')
    : row.customHeatNo || '—';
}

export function sizeLabel(row) {
  return (
    row.lengthMm +
    ' × ' +
    row.outerMm +
    ' mm ' +
    row.dimension.toLowerCase() +
    (row.rodType === 'Hollow' ? ' / ID ' + row.innerMm + ' mm' : '')
  );
}

export function planActual(state, id) {
  return round(
    state.outputs.filter((r) => r.planId === id).reduce((sum, r) => sum + r.actualKg, 0),
  );
}

export function validateState(state) {
  const groups = new Map(inventory(state).map((group) => [group.key, group]));
  const heats = new Set(state.heats.map((row) => row.id));
  const plans = new Map(state.plans.map((row) => [row.id, row]));
  for (const group of groups.values()) {
    if (group.available < 0)
      throw new Error(
        'Not enough billets for ' +
          group.company +
          ' · ' +
          group.grade +
          ' · ' +
          group.size +
          '. This change would make stock negative.',
      );
  }
  for (const row of state.billets) {
    if (row.heatId && !heats.has(row.heatId))
      throw new Error('This heat is used by billet entries. Unlink or remove those entries first.');
  }
  for (const row of state.outputs) {
    const group = groups.get(row.stockKey);
    if (!group || group.company !== row.company || group.grade !== row.grade)
      throw new Error('The billet stock must match the production company and grade.');
    if (row.planId) {
      const plan = plans.get(row.planId);
      if (!plan)
        throw new Error('This plan has production entries. Unlink or remove those entries first.');
      if (plan.company !== row.company || plan.grade !== row.grade)
        throw new Error('Company or grade cannot change while linked production exists.');
    }
  }
}

export function newRecordId(random = globalThis.crypto) {
  if (typeof random?.randomUUID === 'function') return random.randomUUID();
  if (typeof random?.getRandomValues !== 'function')
    throw new Error(
      'This browser does not provide secure random values. Try an up-to-date browser.',
    );
  const bytes = random.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function mutateState(current, action, now = new Date().toISOString(), makeId = newRecordId) {
  if (!action || typeof action !== 'object') throw new Error('Invalid action.');
  const state = structuredClone(current);
  if (action.type === 'master') {
    if (!Object.hasOwn(state.masters, action.kind)) throw new Error('Unknown master list.');
    const value = text.parse(action.value);
    if (value === '__add_new__') throw new Error('Choose a different option name.');
    if (
      action.kind === 'rodSizes' &&
      (!Number.isFinite(Number(value)) || Number(value) <= 0 || Number(value) > 100000)
    )
      throw new Error('Enter a positive size in millimetres.');
    const found = state.masters[action.kind].find(
      (item) => item.toLocaleLowerCase('en-IN') === value.toLocaleLowerCase('en-IN'),
    );
    if (found) return { state: current, value: found };
    state.masters[action.kind].push(value);
    state.revision += 1;
    return { state, value };
  }
  if (!Object.hasOwn(schemas, action.entity)) throw new Error('Unknown record type.');
  const records = state[action.entity];
  const index = records.findIndex((r) => r.id === action.id);
  if (
    index >= 0 &&
    action.expectedVersion != null &&
    action.expectedVersion !== (records[index].recordVersion ?? 1)
  ) {
    throw new Error('This record changed in another tab. Cancel and reopen it before saving.');
  }
  let value;
  if (action.type === 'delete') {
    if (index < 0) throw new Error('This record no longer exists. Refresh the page.');
    value = records[index];
    records.splice(index, 1);
  } else if (action.type === 'save') {
    const payload = schemas[action.entity].parse(action.payload);
    if (action.id && index < 0) throw new Error('This record no longer exists. Refresh the page.');
    value = {
      ...payload,
      id: action.id || makeId(),
      createdAt: index < 0 ? now : records[index].createdAt,
      updatedAt: now,
      recordVersion: index < 0 ? 1 : (records[index].recordVersion ?? 1) + 1,
    };
    if (index < 0) records.push(value);
    else records[index] = value;
  } else if (action.type === 'status' && action.entity === 'plans') {
    if (index < 0) throw new Error('This plan no longer exists.');
    const status = z.enum(PLAN_STATUSES).parse(action.status);
    value = {
      ...records[index],
      status,
      updatedAt: now,
      recordVersion: (records[index].recordVersion ?? 1) + 1,
    };
    records[index] = value;
  } else throw new Error('Unknown action.');
  validateState(state);
  state.revision += 1;
  return { state, value };
}

export function queryRecords(state, entity, filters, today = factoryToday()) {
  const rows = state[entity] ?? [];
  const search = (filters.q || '').trim().toLocaleLowerCase('en-IN');
  const result = rows.filter((row) => {
    if (filters.date === 'today' && row.date !== today) return false;
    if (filters.date === 'yesterday' && row.date !== shiftDate(today, -1)) return false;
    if (
      filters.date === 'custom' &&
      ((filters.from && row.date < filters.from) || (filters.to && row.date > filters.to))
    )
      return false;
    for (const field of ['company', 'grade', 'status', 'size', 'rodType'])
      if (filters[field] && row[field] !== filters[field]) return false;
    if (search) {
      const value = [
        row.heatNo,
        row.company,
        row.grade,
        row.size,
        row.orderName,
        row.rodType,
        row.customHeatNo,
        row.heatId ? heatNumber(row, state) : '',
        entity === 'plans' || entity === 'outputs' ? sizeLabel(row) : '',
        row.planId ? state.plans.find((p) => p.id === row.planId)?.orderName : '',
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('en-IN');
      if (!value.includes(search)) return false;
    }
    return true;
  });
  const sort = [
    'date',
    'company',
    'grade',
    'size',
    'count',
    'totalKg',
    'plannedKg',
    'actualKg',
    'heatNo',
    'priority',
    'furnaceNo',
    'chargeKg',
    'meltMinutes',
    'orderName',
    'rodType',
    'billetsUsed',
    'scrapKg',
  ].includes(filters.sort)
    ? filters.sort
    : 'date';
  const multiplier = filters.dir === 'asc' ? 1 : -1;
  return result.sort((a, b) => {
    const value = (row) =>
      sort === 'chargeKg'
        ? totalCharge(row.materials)
        : sort === 'meltMinutes'
          ? meltingMinutes(row.startTime, row.readyTime)
          : (row[sort] ?? '');
    const av = value(a);
    const bv = value(b);
    const compare =
      typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv), 'en-IN', { numeric: true });
    return compare * multiplier || String(b.createdAt).localeCompare(String(a.createdAt));
  });
}

export function csvCell(value) {
  let textValue = String(value ?? '');
  if (/^\s*[=+\-@]/.test(textValue) || /^[\t\r]/.test(textValue)) textValue = "'" + textValue;
  return '"' + textValue.replaceAll('"', '""') + '"';
}

export function csvContent(headers, rows) {
  return '\uFEFF' + [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}
