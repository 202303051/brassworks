import { useState } from 'react';
import { useFactory } from './FactoryProvider';
import {
  displayDate,
  heatNumber,
  inventory,
  meltingMinutes,
  planActual,
  recovery,
  sizeLabel,
  stockKey,
  totalCharge,
} from './model';
import {
  Badge,
  DepartmentTabs,
  Empty,
  FilterBar,
  FilterSelect,
  ListActions,
  number,
  PageState,
  Pagination,
  PullRefresh,
  RecordHeading,
  RecordLink,
  useRecordQuery,
} from './ui';
import { DeleteRecord, EditRecord, PlanStatus } from './RecordActions';
import PrintRecords from './PrintRecords';

const cell = 'px-4 py-3 text-sm align-top';
const th =
  'px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground';
const rowTone = (status) =>
  status === 'Completed' || status === 'Pass'
    ? 'bg-success-muted/40'
    : status === 'In Production'
      ? 'bg-highlight/5'
      : status === 'Correction Done'
        ? 'bg-warning-muted/60'
        : '';

function Metrics({ values }) {
  return (
    <div className="mb-6 flex flex-wrap divide-x divide-border rounded-lg border border-border bg-card py-5">
      {values.map(([label, value, unit]) => (
        <div key={label} className="min-w-36 flex-1 px-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 font-heading text-3xl font-semibold tabular-nums">
            {value}
            <span className="ml-1.5 text-base font-medium text-muted-foreground">{unit}</span>
          </p>
        </div>
      ))}
    </div>
  );
}

function Actions({ entity, row }) {
  return (
    <div className="flex flex-wrap gap-1">
      <EditRecord entity={entity} row={row} />
      <DeleteRecord entity={entity} row={row} />
    </div>
  );
}

export function FurnaceLog() {
  const { data } = useFactory();
  const query = useRecordQuery('heats');
  const [expanded, setExpanded] = useState(null);
  const average = query.rows.length
    ? query.rows.reduce((sum, row) => sum + meltingMinutes(row.startTime, row.readyTime), 0) /
      query.rows.length
    : 0;
  return (
    <PullRefresh>
      <div className="print:hidden">
        <RecordHeading
          title="Furnace operations"
          eyebrow="Section 01 / Furnace department"
          description="Track the melt, charge and final composition together."
        >
          <ListActions entity="heats" query={query} />
        </RecordHeading>
      </div>
      <PageState>
        <div className="print:hidden">
          <Metrics
            values={[
              ['Matching heats', number(query.rows.length, 0), ''],
              [
                'Charge weight',
                number(query.rows.reduce((s, r) => s + totalCharge(r.materials), 0)),
                'kg',
              ],
              ['Average melt', number(average, 0), 'min'],
            ]}
          />
          <FilterBar query={query}>
            <FilterSelect
              label="Grades"
              options={data?.masters.grades || []}
              value={query.filters.grade}
              onChange={(v) => query.update('grade', v)}
            />
            <FilterSelect
              label="Statuses"
              options={['Pass', 'Correction Done']}
              value={query.filters.status}
              onChange={(v) => query.update('status', v)}
            />
          </FilterBar>
          {!query.rows.length ? (
            <Empty title="No matching heats" createTo="/furnace/new" />
          ) : (
            <div className="space-y-3">
              {query.pageRows.map((row) => (
                <article
                  key={row.id}
                  className={
                    'overflow-hidden rounded-lg border border-border ' + rowTone(row.status)
                  }
                >
                  <div className="grid items-center gap-4 p-4 lg:grid-cols-[1.2fr_1fr_1fr_auto]">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {displayDate(row.date)} · {row.shift} · {row.furnaceNo}
                      </p>
                      <RecordLink entity="heats" row={row}>
                        {row.heatNo}
                      </RecordLink>
                      <p className="text-xs text-muted-foreground">{row.grade}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Charge / melting time</p>
                      <p className="mt-1 text-sm font-semibold">
                        {number(totalCharge(row.materials))} kg ·{' '}
                        {meltingMinutes(row.startTime, row.readyTime)} min
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {row.startTime} → {row.readyTime} IST
                      </p>
                    </div>
                    <div>
                      <Badge tone={row.status === 'Pass' ? 'good' : 'warning'}>{row.status}</Badge>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Cu {number(row.cu)}% · Zn {number(row.zn)}%
                      </p>
                    </div>
                    <Actions entity="heats" row={row} />
                  </div>
                  <button
                    type="button"
                    className="flex min-h-12 w-full items-center justify-between border-t border-border px-4 text-left text-xs font-bold hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                    aria-expanded={expanded === row.id}
                    onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                  >
                    <span>Materials & spectro detail</span>
                    <span aria-hidden="true">{expanded === row.id ? '−' : '+'}</span>
                  </button>
                  {expanded === row.id && (
                    <div className="grid gap-5 border-t border-border bg-card p-5 sm:grid-cols-2">
                      <div>
                        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Charge breakdown
                        </h2>
                        {row.materials.map((m, index) => (
                          <p key={index} className="mt-2 flex justify-between gap-4 text-sm">
                            <span>{m.material}</span>
                            <strong>{number(m.kg)} kg</strong>
                          </p>
                        ))}
                      </div>
                      <div>
                        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Final spectro (%)
                        </h2>
                        <div className="mt-3 flex flex-wrap gap-3">
                          {['cu', 'zn', 'pb', 'fe', 'sn'].map((element) => (
                            <span key={element} className="rounded bg-muted px-3 py-2 text-xs">
                              <span className="uppercase">{element}</span>{' '}
                              <strong>{number(row[element], 4)}</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
          <Pagination query={query} />
        </div>
        <PrintRecords entity="heats" rows={query.rows} data={data} />
      </PageState>
    </PullRefresh>
  );
}

export function BilletLog() {
  const { data } = useFactory();
  const query = useRecordQuery('billets');
  const matchingGroups = new Set(
    data ? query.rows.map((r) => stockKey(r.company, r.grade, r.size)) : [],
  );
  const groups = data
    ? inventory(data).filter((g) => {
        if (query.filters.company && g.company !== query.filters.company) return false;
        if (query.filters.grade && g.grade !== query.filters.grade) return false;
        if (query.filters.size && g.size !== query.filters.size) return false;
        if (query.filters.q && !matchingGroups.has(g.key)) return false;
        return true;
      })
    : [];
  return (
    <PullRefresh>
      <div className="print:hidden">
        <RecordHeading
          title="Billets & inventory"
          eyebrow="Section 02 / Production department"
          description="Receive billets and see the stock left after finished-production consumption."
        >
          <ListActions entity="billets" query={query} />
        </RecordHeading>
        <DepartmentTabs />
      </div>
      <PageState>
        <div className="print:hidden">
          <div className="mb-6 rounded-lg border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5">
              <div>
                <h2 className="font-heading text-2xl font-semibold">Total billet summary</h2>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">
                  Availability includes all dates. “Today” counts receipts on the current IST date.
                </p>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Today received
                  </p>
                  <p className="font-heading text-3xl font-semibold">
                    {number(
                      groups.reduce((s, g) => s + g.today, 0),
                      0,
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Available total
                  </p>
                  <p className="font-heading text-3xl font-semibold text-highlight">
                    {number(
                      groups.reduce((s, g) => s + g.available, 0),
                      0,
                    )}
                  </p>
                </div>
              </div>
            </div>
            <div className="max-h-80 overflow-auto">
              <table className="hidden w-full min-w-[650px] md:table">
                <thead className="sticky top-0 bg-card">
                  <tr>
                    <th className={th}>Company / grade</th>
                    <th className={th}>Size</th>
                    <th className={th + ' text-right'}>Today</th>
                    <th className={th + ' text-right'}>Received</th>
                    <th className={th + ' text-right'}>Used</th>
                    <th className={th + ' text-right'}>Available</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => (
                    <tr key={g.key} className="border-t border-border">
                      <td className={cell}>
                        <p className="font-semibold">{g.company}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{g.grade}</p>
                      </td>
                      <td className={cell}>{g.size}</td>
                      <td className={cell + ' text-right tabular-nums'}>{g.today}</td>
                      <td className={cell + ' text-right tabular-nums'}>{g.received}</td>
                      <td className={cell + ' text-right tabular-nums'}>{g.used}</td>
                      <td className={cell + ' text-right font-bold tabular-nums'}>{g.available}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="divide-y divide-border md:hidden">
                {groups.map((g) => (
                  <div key={g.key} className="p-4">
                    <div className="flex justify-between gap-3">
                      <p className="text-sm font-semibold">{g.company}</p>
                      <p className="shrink-0 font-heading text-2xl font-semibold">
                        {g.available}{' '}
                        <span className="text-xs text-muted-foreground">available</span>
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {g.grade} · {g.size}
                    </p>
                    <p className="mt-2 text-xs">
                      Today {g.today} · Received {g.received} · Used {g.used}
                    </p>
                  </div>
                ))}
              </div>
              {!groups.length && (
                <p className="p-5 text-sm text-muted-foreground">
                  No stock groups match these filters.
                </p>
              )}
            </div>
          </div>
          <FilterBar query={query}>
            <FilterSelect
              label="Companies"
              options={data?.masters.companies || []}
              value={query.filters.company}
              onChange={(v) => query.update('company', v)}
            />
            <FilterSelect
              label="Grades"
              options={data?.masters.grades || []}
              value={query.filters.grade}
              onChange={(v) => query.update('grade', v)}
            />
            <FilterSelect
              label="Sizes"
              options={data?.masters.billetSizes || []}
              value={query.filters.size}
              onChange={(v) => query.update('size', v)}
            />
          </FilterBar>
          {!query.rows.length ? (
            <Empty title="No matching billet entries" createTo="/billets/new" />
          ) : (
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              {query.pageRows.map((row) => (
                <article
                  key={row.id}
                  className="grid items-center gap-4 border-b border-border p-4 last:border-b-0 lg:grid-cols-[1.2fr_1fr_140px_auto]"
                >
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {displayDate(row.date)} · {heatNumber(row, data)}
                    </p>
                    <RecordLink entity="billets" row={row}>
                      {row.company}
                    </RecordLink>
                    <p className="text-xs text-muted-foreground">{row.grade}</p>
                  </div>
                  <p className="text-sm font-medium">{row.size}</p>
                  <div className="lg:text-right">
                    <p className="font-heading text-2xl font-semibold tabular-nums">
                      {number(row.count, 0)}{' '}
                      <span className="text-xs text-muted-foreground">billets</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{number(row.totalKg)} kg</p>
                  </div>
                  <Actions entity="billets" row={row} />
                </article>
              ))}
            </div>
          )}
          <Pagination query={query} />
        </div>
        <PrintRecords entity="billets" rows={query.rows} data={data} />
      </PageState>
    </PullRefresh>
  );
}

export function PlanningLog() {
  const { data } = useFactory();
  const query = useRecordQuery('plans');
  return (
    <PullRefresh>
      <div className="print:hidden">
        <RecordHeading
          title="Brass rod planning"
          eyebrow="Section 03 / Production department"
          description="Set shape, dimensions, target and party. Advance each plan as the run progresses."
        >
          <ListActions entity="plans" query={query} />
        </RecordHeading>
        <DepartmentTabs />
      </div>
      <PageState>
        <div className="print:hidden">
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {['Round', 'Hexa', 'Octa', 'Hollow'].map((shape) => (
              <div
                key={shape}
                className="flex flex-col items-start justify-between gap-1 rounded-2xl border border-border bg-card px-5 py-3 sm:flex-row sm:items-center sm:gap-3"
              >
                <p className="text-xs font-bold">{shape}</p>
                <p className="font-heading text-2xl font-semibold tabular-nums">
                  {number(
                    query.rows
                      .filter((r) => r.rodType === shape)
                      .reduce((s, r) => s + r.plannedKg, 0),
                  )}
                  <span className="ml-1 text-xs text-muted-foreground">kg</span>
                </p>
              </div>
            ))}
          </div>
          <FilterBar query={query}>
            <FilterSelect
              label="Companies"
              options={data?.masters.companies || []}
              value={query.filters.company}
              onChange={(v) => query.update('company', v)}
            />
            <FilterSelect
              label="Grades"
              options={data?.masters.grades || []}
              value={query.filters.grade}
              onChange={(v) => query.update('grade', v)}
            />
            <FilterSelect
              label="Shapes"
              options={['Round', 'Hexa', 'Octa', 'Hollow']}
              value={query.filters.rodType}
              onChange={(v) => query.update('rodType', v)}
            />
            <FilterSelect
              label="Statuses"
              options={['Planned', 'In Production', 'Completed']}
              value={query.filters.status}
              onChange={(v) => query.update('status', v)}
            />
          </FilterBar>
          {!query.rows.length ? (
            <Empty title="No matching rod plans" createTo="/plans/new" />
          ) : (
            <div className="space-y-3">
              {query.pageRows.map((row) => (
                <article
                  key={row.id}
                  className={'rounded-lg border border-border p-5 ' + rowTone(row.status)}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <RecordLink entity="plans" row={row}>
                          {row.orderName}
                        </RecordLink>
                        {row.priority === 'Urgent' && <Badge tone="warning">Urgent</Badge>}
                      </div>
                      <p className="text-sm font-semibold">{row.company}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {displayDate(row.date)} · {row.grade}
                      </p>
                    </div>
                    <PlanStatus row={row} />
                  </div>
                  <div className="mt-4 grid items-end gap-4 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_auto]">
                    <div>
                      <p className="text-sm font-bold">{row.rodType}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{sizeLabel(row)}</p>
                    </div>
                    <div>
                      <p className="text-sm">
                        <strong>{number(row.plannedKg)} kg</strong> planned
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {number(data ? planActual(data, row.id) : 0)} kg produced
                      </p>
                    </div>
                    <Actions entity="plans" row={row} />
                  </div>
                </article>
              ))}
            </div>
          )}
          <Pagination query={query} />
        </div>
        <PrintRecords entity="plans" rows={query.rows} data={data} />
      </PageState>
    </PullRefresh>
  );
}

export function FinishedLog() {
  const { data } = useFactory();
  const query = useRecordQuery('outputs');
  const actual = query.rows.reduce((s, r) => s + r.actualKg, 0);
  const scrap = query.rows.reduce((s, r) => s + r.scrapKg, 0);
  const ids = new Set(query.rows.map((r) => r.planId).filter(Boolean));
  const planned =
    data?.plans.filter((p) => ids.has(p.id)).reduce((s, r) => s + r.plannedKg, 0) || 0;
  return (
    <PullRefresh>
      <div className="print:hidden">
        <RecordHeading
          title="Finished rods & recovery"
          eyebrow="Section 04 / Production department"
          description="Record finished rods and scrap while consuming the selected billet stock."
        >
          <ListActions entity="outputs" query={query} />
        </RecordHeading>
        <DepartmentTabs />
      </div>
      <PageState>
        <div className="print:hidden">
          <Metrics
            values={[
              ['Linked order targets', number(planned), 'kg'],
              ['Actual rods', number(actual), 'kg'],
              [
                'Billets consumed',
                number(
                  query.rows.reduce((s, r) => s + r.billetsUsed, 0),
                  0,
                ),
                '',
              ],
              ['Net recovery', number(recovery(actual, scrap), 2), '%'],
            ]}
          />
          <FilterBar query={query}>
            <FilterSelect
              label="Companies"
              options={data?.masters.companies || []}
              value={query.filters.company}
              onChange={(v) => query.update('company', v)}
            />
            <FilterSelect
              label="Grades"
              options={data?.masters.grades || []}
              value={query.filters.grade}
              onChange={(v) => query.update('grade', v)}
            />
          </FilterBar>
          {!query.rows.length ? (
            <Empty title="No matching finished production" createTo="/output/new" />
          ) : (
            <div className="space-y-3">
              {query.pageRows.map((row) => {
                const plan = data?.plans.find((p) => p.id === row.planId);
                return (
                  <article key={row.id} className="rounded-lg border border-border bg-card p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {displayDate(row.date)} · {plan?.orderName || 'Manual production'}
                        </p>
                        <RecordLink entity="outputs" row={row}>
                          {row.company}
                        </RecordLink>
                        <p className="text-xs text-muted-foreground">
                          {row.grade} · {row.rodType} · {sizeLabel(row)}
                        </p>
                      </div>
                      <Badge tone="good">
                        {number(recovery(row.actualKg, row.scrapKg), 2)}% recovery
                      </Badge>
                    </div>
                    <div className="mt-5 grid items-end gap-4 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
                      <div>
                        <p className="text-xs text-muted-foreground">Order target</p>
                        <p className="mt-1 text-sm font-semibold">
                          {plan ? number(plan.plannedKg) + ' kg' : 'Manual run'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Actual / scrap</p>
                        <p className="mt-1 text-sm font-semibold">
                          {number(row.actualKg)} / {number(row.scrapKg)} kg
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Billets used</p>
                        <p className="mt-1 text-sm font-semibold">{number(row.billetsUsed, 0)}</p>
                      </div>
                      <Actions entity="outputs" row={row} />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          <Pagination query={query} />
        </div>
        <PrintRecords entity="outputs" rows={query.rows} data={data} />
      </PageState>
    </PullRefresh>
  );
}
