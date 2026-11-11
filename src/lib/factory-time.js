const DATE_OPTIONS = Object.freeze({
  timeZone: 'Asia/Kolkata',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function parseInstant(instant) {
  // Require an explicit offset: a bare local timestamp changes meaning by device.
  if (
    typeof instant !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(instant)
  ) {
    throw new RangeError('An ISO timestamp with a timezone is required.');
  }

  const value = new Date(instant);

  if (!Number.isFinite(value.getTime())) {
    throw new RangeError('The timestamp is invalid.');
  }

  // JavaScript normalizes dates such as February 30; reject them before display.
  const [year, month, day] = instant.slice(0, 10).split('-').map(Number);
  const calendar = new Date(0);
  calendar.setUTCFullYear(year, month - 1, day);
  calendar.setUTCHours(0, 0, 0, 0);

  if (
    calendar.getUTCFullYear() !== year ||
    calendar.getUTCMonth() !== month - 1 ||
    calendar.getUTCDate() !== day
  ) {
    throw new RangeError('The calendar date is invalid.');
  }

  return value;
}

export function formatFactoryDate(instant) {
  return new Intl.DateTimeFormat('en-IN', DATE_OPTIONS).format(parseInstant(instant));
}

export function formatFactoryTime(instant) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(parseInstant(instant));
}
