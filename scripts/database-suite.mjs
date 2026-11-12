import { readFileSync, readdirSync } from 'node:fs';

const root = new URL('../supabase/', import.meta.url);
const read = (file) => readFileSync(new URL(file, root), 'utf8');

export async function runDatabaseSuite(sql, transaction) {
  sql(read('tests/000_bootstrap.sql'), 'local Supabase auth test shim');
  const migrations = readdirSync(new URL('migrations/', root))
    .filter((name) => name.endsWith('.sql'))
    .sort();
  if (!migrations.length) throw new Error('No database migrations found');
  for (const name of migrations) sql(read('migrations/' + name), 'migration ' + name);
  sql(read('seed.sql'), 'fake factory seed');
  const tests = readdirSync(new URL('tests/', root))
    .filter((name) => name.endsWith('.test.sql'))
    .sort();
  if (!tests.length) throw new Error('No SQL behavioral tests found');
  let assertions = 0;
  for (const name of tests) {
    const output = sql(read('tests/' + name));
    const count = output.match(/DATABASE_ASSERTIONS=(\d+)/);
    if (!count || Number(count[1]) < 1)
      throw new Error(name + ': no completed assertions reported');
    assertions += Number(count[1]);
    console.log(`PASS ${name}: ${count[1]} SQL assertions`);
  }
  const cases = JSON.parse(read('tests/concurrency-cases.json'));
  if (cases.length < 2) throw new Error('Stock and active-user concurrency cases are required');
  for (const test of cases) {
    sql(test.setup);
    const outcomes = await Promise.all(test.transactions.map(transaction));
    const successes = outcomes.filter((result) => result.code === 0);
    const failures = outcomes.filter((result) => result.code !== 0);
    if (successes.length !== 1 || failures.length !== 1)
      throw new Error(
        `${test.name}: expected one successful transaction and one rejection: ${JSON.stringify(outcomes)}`,
      );
    if (!new RegExp(test.expectedError, 'i').test(failures[0].stderr))
      throw new Error(`${test.name}: unexpected failure: ${failures[0].stderr}`);
    const output = sql(test.verify).trim();
    if (JSON.parse(output).ok !== true)
      throw new Error(`${test.name}: invalid final state: ${output}`);
    console.log(`PASS concurrent ${test.name}: ${output}`);
  }
  console.log(
    `Database constraints, policies, triggers and concurrent-write checks passed. (${assertions} SQL assertions, ${cases.length} concurrency cases)`,
  );
  return { assertions, concurrencyCases: cases.length };
}
