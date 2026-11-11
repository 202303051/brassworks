export const SPECTRO_ELEMENTS = [
  ['cu', 'Cu', 'Copper'],
  ['zn', 'Zn', 'Zinc'],
  ['pb', 'Pb', 'Lead'],
  ['fe', 'Fe', 'Iron'],
  ['sn', 'Sn', 'Tin'],
];

const aliases = new Map(
  SPECTRO_ELEMENTS.flatMap(([key, symbol, name]) => [
    [symbol.toLowerCase(), key],
    [name.toLowerCase(), key],
  ]),
);
const elementPattern = /\b(Cu|Zn|Pb|Fe|Sn|Copper|Zinc|Lead|Iron|Tin)\b/gi;
const numberPattern = /[<>≤≥]?\s*[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)(?:[eE][+-]?\d+)?/g;

function readValue(text) {
  const tokens = [...text.matchAll(numberPattern)].map((match) => match[0].trim());
  if (tokens.length !== 1) return null;
  if (/[<>≤≥]/.test(tokens[0]))
    return { issue: 'A less-than/greater-than result needs manual review.' };
  const raw = Number(tokens[0].replace(',', '.'));
  const value = /\bppm\b|mg\s*\/\s*kg/i.test(text) ? raw / 10000 : raw;
  if (!Number.isFinite(value) || value < 0 || value > 100)
    return { issue: 'The detected value is outside 0–100%.' };
  return { value: Number(value.toFixed(6)) };
}

export function parseSpectroText(input) {
  if (typeof input !== 'string' || input.length > 100000)
    throw new Error(
      'The recognized text is invalid or too large. Crop the photo to its results table.',
    );
  const lines = input
    .normalize('NFKC')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const candidates = Object.fromEntries(SPECTRO_ELEMENTS.map(([key]) => [key, []]));
  const warnings = new Set();
  const add = (key, reading) => {
    if (!reading) return;
    if (reading.issue) warnings.add(key.toUpperCase() + ': ' + reading.issue);
    else if (!candidates[key].includes(reading.value)) candidates[key].push(reading.value);
  };
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const labels = [...line.matchAll(elementPattern)];
    if (!labels.length) continue;
    // Horizontal reports: element headings on one row, percentages on the next.
    if (labels.length > 1 && !/\d/.test(line)) {
      const next = lines[index + 1] || '';
      const tokens = [...next.matchAll(numberPattern)];
      if (tokens.length === labels.length && !elementPattern.test(next)) {
        const unit = /ppm|mg\s*\/\s*kg/i.test(line + ' ' + next) ? ' ppm' : '';
        labels.forEach((label, position) =>
          add(aliases.get(label[1].toLowerCase()), readValue(tokens[position][0] + unit)),
        );
      }
      elementPattern.lastIndex = 0;
    }
    labels.forEach((label, position) => {
      const key = aliases.get(label[1].toLowerCase());
      const suffix = line.slice(
        label.index + label[0].length,
        labels[position + 1]?.index ?? line.length,
      );
      let reading = readValue(suffix);
      if (!reading && labels.length === 1 && !/\d/.test(suffix)) {
        const next = lines[index + 1] || '';
        if (/^[\s%:<>≤≥+\-.,\deE]+(?:\s*(?:ppm|wt\.?\s*%))?$/i.test(next))
          reading = readValue(next);
      }
      if (
        !reading &&
        labels.length === 1 &&
        !/\d/.test(suffix) &&
        /^[\s\d.,eE%+-]+$/.test(line.slice(0, label.index))
      )
        reading = readValue(line.slice(0, label.index));
      add(key, reading);
    });
  }
  const values = {};
  for (const [key, symbol] of SPECTRO_ELEMENTS) {
    if (candidates[key].length === 1) values[key] = candidates[key][0];
    if (candidates[key].length > 1)
      warnings.add(
        symbol + ': multiple different readings were found. Enter the correct result manually.',
      );
  }
  if (!Object.keys(values).length)
    warnings.add(
      'No unambiguous element percentages were found. Try a clearer, tightly cropped photo.',
    );
  return { values, candidates, warnings: [...warnings] };
}
