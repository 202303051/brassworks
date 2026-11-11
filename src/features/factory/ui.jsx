import { useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import Icon from '@/components/Icon';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useFactory } from './FactoryProvider';
import {
  csvContent,
  displayDate,
  factoryToday,
  heatNumber,
  inventory,
  meltingMinutes,
  queryRecords,
  recovery,
  sizeLabel,
  totalCharge,
} from './model';

export const parents = {
  heats: '/departments/furnace',
  billets: '/departments/production',
  plans: '/production/planning',
  outputs: '/production/finished',
};
export const routes = {
  heats: '/furnace',
  billets: '/billets',
  plans: '/plans',
  outputs: '/output',
};
export const names = {
  heats: 'Furnace',
  billets: 'Billets',
  plans: 'Rod planning',
  outputs: 'Finished production',
};
export const fieldClass =
  'min-h-12 w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60';
export const number = (value, decimals = 3) =>
  Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: decimals });
export const recordTitle = (entity, row) =>
  entity === 'heats'
    ? row.heatNo
    : entity === 'plans'
      ? row.orderName
      : row.company + ' · ' + displayDate(row.date);

export function message(error) {
  if (error?.issues?.length)
    return error.issues
      .map((i) => i.message)
      .slice(0, 3)
      .join(' · ');
  return error?.message || 'The change could not be saved.';
}

export function Badge({ children, tone = 'neutral' }) {
  const style = {
    neutral: 'bg-muted text-muted-foreground',
    good: 'bg-success-muted text-success',
    warning: 'bg-warning-muted text-warning',
    brand: 'bg-highlight/10 text-highlight',
    danger: 'bg-destructive/10 text-destructive',
  };
  return (
    <span
      className={
        'inline-flex rounded-md px-2.5 py-1 text-[11px] font-bold ' + (style[tone] || style.neutral)
      }
    >
      {children}
    </span>
  );
}

export function Field({ label, id, error, hint, required, children }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-2 block text-sm font-semibold">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {children}
      {error && (
        <p id={id + '-error'} role="alert" className="mt-1.5 text-xs leading-5 text-destructive">
          {error}
        </p>
      )}
      {hint && <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function FormPanel({ step, title, description, children }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 sm:p-7">
      <div className="mb-5 flex items-start gap-3">
        {step && (
          <span className="font-heading text-3xl font-semibold text-muted-foreground/50">
            {step}
          </span>
        )}
        <div>
          <h2 className="font-heading text-2xl font-semibold">{title}</h2>
          {description && (
            <p className="mt-1 text-xs leading-6 text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

export function Confirm({
  open,
  onOpenChange,
  title,
  description,
  action,
  actionLabel = 'Confirm',
  danger = false,
}) {
  const [pending, setPending] = useState(false);
  const locked = useRef(false);
  async function performConfirmation() {
    if (locked.current) return;
    locked.current = true;
    setPending(true);
    try {
      await action();
      onOpenChange(false);
    } catch (error) {
      toast.error(message(error));
    } finally {
      setPending(false);
      locked.current = false;
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!pending) onOpenChange(value);
      }}
    >
      <DialogContent className="max-w-[calc(100vw-2rem)] [&>button]:flex [&>button]:min-h-12 [&>button]:min-w-12 [&>button]:items-center [&>button]:justify-center sm:max-w-md">
        <DialogHeader className="pr-12">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            className="min-h-12"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="min-h-12"
            variant={danger ? 'destructive' : 'default'}
            disabled={pending}
            onClick={performConfirmation}
          >
            {pending && <Icon name="LoaderCircle" size={16} className="animate-spin" />}
            {pending ? 'Working…' : actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ResetDemoButton() {
  const { reset } = useFactory();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" className="min-h-12 gap-2 px-3 text-xs" onClick={() => setOpen(true)}>
        <Icon name="RotateCcw" size={16} />
        <span>Reset demo</span>
      </Button>
      <Confirm
        open={open}
        onOpenChange={setOpen}
        title="Replace all demo data?"
        description="This replaces every factory record and added master option in this browser with fresh sample data. Export any records you want to keep first."
        actionLabel="Reset demo data"
        danger
        action={async () => {
          await reset();
          navigate('/', { replace: true });
          toast.success('Demo data reset');
        }}
      />
    </>
  );
}

export function PageState({ children }) {
  const { data, loading, error, refresh } = useFactory();
  if (error && !data)
    return (
      <div className="rounded-lg border border-destructive/30 bg-card p-8" role="alert">
        <h2 className="font-heading text-2xl">Demo data could not load</h2>
        <p className="my-4 text-sm text-muted-foreground">{error}</p>
        <Button className="min-h-12" onClick={() => refresh().catch(() => {})}>
          Try again
        </Button>
      </div>
    );
  if (!data)
    return (
      <div className="space-y-5" aria-label="Loading demo records">
        <Skeleton className="h-24 w-full" />
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  return (
    <div aria-busy={loading} className={loading ? 'opacity-60' : ''}>
      {children}
    </div>
  );
}

export function DepartmentTabs() {
  const tabs = [
    { to: '/departments/production', label: '02 · Billets' },
    { to: '/production/planning', label: '03 · Rod planning' },
    { to: '/production/finished', label: '04 · Finished rods' },
  ];
  return (
    <nav
      aria-label="Production sections"
      className="mb-7 flex gap-5 overflow-x-auto border-b border-border"
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end
          className={({ isActive }) =>
            'flex min-h-12 shrink-0 items-center border-b-2 px-1 text-sm font-bold ' +
            (isActive
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground')
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function RecordHeading({ title, eyebrow, description, children, back = '/' }) {
  return (
    <div className="mb-7">
      <Button
        asChild
        variant="ghost"
        className="mb-5 min-h-12 px-0 hover:bg-transparent hover:underline"
      >
        <Link to={back}>
          <Icon name="ArrowLeft" size={17} />
          {back === '/'
            ? 'Back to Home'
            : 'Back to ' +
              (back.startsWith('/departments/furnace')
                ? 'Furnace'
                : back.startsWith('/production/planning')
                  ? 'Rod planning'
                  : back.startsWith('/production/finished')
                    ? 'Finished production'
                    : 'Billets')}
        </Link>
      </Button>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            {eyebrow}
          </p>
          <h1 className="mt-2 break-words font-heading text-5xl font-bold uppercase sm:text-6xl">
            {title}
          </h1>
          {description && (
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">{children}</div>
      </div>
    </div>
  );
}

export function useRecordQuery(entity) {
  const { data } = useFactory();
  const [params, setParams] = useSearchParams();
  const filters = Object.fromEntries(params);
  const rows = data ? queryRecords(data, entity, filters) : [];
  const [pageSize, setPageSize] = useState(8);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.min(Math.max(1, Number.parseInt(filters.page || '1', 10) || 1), pageCount);
  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };
  const clear = () => setParams({}, { replace: true });
  const sort = (column) => {
    const next = new URLSearchParams(params);
    next.set('sort', column);
    next.set('dir', filters.sort === column && filters.dir === 'asc' ? 'desc' : 'asc');
    next.delete('page');
    setParams(next, { replace: true });
  };
  return {
    entity,
    rows,
    pageRows: rows.slice((page - 1) * pageSize, page * pageSize),
    filters,
    update,
    clear,
    sort,
    page,
    pageCount,
    pageSize,
    setPageSize,
  };
}

export function FilterBar({ query, children }) {
  const { filters, update, clear } = query;
  const sortOptions = {
    heats: [
      ['date', 'Date'],
      ['heatNo', 'Heat number'],
      ['furnaceNo', 'Furnace'],
      ['grade', 'Grade'],
      ['chargeKg', 'Charge kg'],
      ['meltMinutes', 'Melting time'],
    ],
    billets: [
      ['date', 'Date'],
      ['company', 'Company'],
      ['grade', 'Grade'],
      ['size', 'Size'],
      ['count', 'Billet count'],
      ['totalKg', 'Weight kg'],
    ],
    plans: [
      ['date', 'Date'],
      ['orderName', 'Order'],
      ['company', 'Company'],
      ['grade', 'Grade'],
      ['rodType', 'Rod type'],
      ['plannedKg', 'Planned kg'],
      ['priority', 'Priority'],
    ],
    outputs: [
      ['date', 'Date'],
      ['company', 'Company'],
      ['grade', 'Grade'],
      ['actualKg', 'Actual kg'],
      ['scrapKg', 'Scrap kg'],
      ['billetsUsed', 'Billets used'],
    ],
  }[query.entity];
  const invalid =
    filters.date === 'custom' && filters.from && filters.to && filters.from > filters.to;
  return (
    <div className="mb-5 rounded-lg border border-border bg-card p-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]">
        <label className="relative block">
          <span className="sr-only">Search records</span>
          <Icon name="Search" size={17} className="absolute left-3 top-4 text-muted-foreground" />
          <input
            className={fieldClass + ' pl-10'}
            value={filters.q || ''}
            onChange={(e) => update('q', e.target.value)}
            placeholder="Heat, company, grade or size…"
            type="search"
          />
        </label>
        <label>
          <span className="sr-only">Date filter</span>
          <select
            aria-label="Date filter"
            className={fieldClass}
            value={filters.date || 'all'}
            onChange={(e) => update('date', e.target.value === 'all' ? '' : e.target.value)}
          >
            <option value="all">All dates</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="custom">Custom dates</option>
          </select>
        </label>
        <Button variant="outline" className="min-h-12" onClick={clear}>
          <Icon name="FilterX" size={16} />
          Clear filters
        </Button>
      </div>
      {filters.date === 'custom' && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="From" id="filter-from">
            <input
              id="filter-from"
              className={fieldClass}
              type="date"
              value={filters.from || ''}
              onChange={(e) => update('from', e.target.value)}
            />
          </Field>
          <Field
            label="Through"
            id="filter-to"
            error={invalid ? 'End date must be on or after the start date.' : null}
          >
            <input
              id="filter-to"
              className={fieldClass}
              type="date"
              min={filters.from || undefined}
              value={filters.to || ''}
              onChange={(e) => update('to', e.target.value)}
            />
          </Field>
        </div>
      )}
      {children && <div className="mt-3 flex flex-wrap gap-3">{children}</div>}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {query.rows.length} matching record{query.rows.length === 1 ? '' : 's'}
        </span>
        <div className="flex gap-2">
          <select
            aria-label="Sort column"
            className="min-h-12 rounded border border-input bg-background px-2"
            value={filters.sort || 'date'}
            onChange={(e) => update('sort', e.target.value)}
          >
            {sortOptions.map(([value, label]) => (
              <option key={value} value={value}>
                Sort by {label.toLowerCase()}
              </option>
            ))}
          </select>
          <Button
            variant="ghost"
            className="min-h-12"
            onClick={() => update('dir', filters.dir === 'asc' ? 'desc' : 'asc')}
          >
            {filters.dir === 'asc' ? 'Ascending' : 'Descending'}
            <Icon name="ArrowUpDown" size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function FilterSelect({ label, value, options, onChange }) {
  return (
    <label className="min-w-36 flex-1">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        className={fieldClass}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">All {label.toLowerCase()}</option>
        {options.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Pagination({ query }) {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
      <label className="flex items-center gap-2">
        Rows per page
        <select
          className="min-h-12 rounded-md border border-input bg-background px-2"
          value={query.pageSize}
          onChange={(e) => {
            query.setPageSize(Number(e.target.value));
            query.update('page', '1');
          }}
        >
          <option value="8">8</option>
          <option value="16">16</option>
          <option value="32">32</option>
        </select>
      </label>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="min-h-12"
          disabled={query.page <= 1}
          onClick={() => query.update('page', String(query.page - 1))}
        >
          Previous
        </Button>
        <span>
          Page {query.page} of {query.pageCount}
        </span>
        <Button
          variant="outline"
          className="min-h-12"
          disabled={query.page >= query.pageCount}
          onClick={() => query.update('page', String(query.page + 1))}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export function Empty({ title, createTo }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
      <Icon name="ClipboardList" size={30} className="mx-auto mb-3 text-muted-foreground" />
      <h2 className="font-heading text-2xl">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Try clearing the filters, or add your first matching record.
      </p>
      <Button asChild className="mt-5 min-h-12">
        <Link to={createTo}>Add a record</Link>
      </Button>
    </div>
  );
}

export function RecordLink({ entity, row, children }) {
  const location = useLocation();
  return (
    <Link
      to={routes[entity] + '/' + row.id}
      state={{ returnTo: location.pathname + location.search }}
      className="inline-flex min-h-12 items-center gap-1 font-semibold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
    >
      {children || 'View record'}
      <Icon name="ArrowUpRight" size={15} />
    </Link>
  );
}

export function exportRows(entity, rows, data) {
  const stockSizes =
    entity === 'outputs'
      ? new Map(inventory(data).map((group) => [group.key, group.size]))
      : new Map();
  let headers;
  let values;
  if (entity === 'heats') {
    headers = [
      'Date',
      'Shift',
      'Furnace',
      'Heat',
      'Start',
      'Liquid ready',
      'Melting minutes',
      'Charge kg',
      'Materials',
      'Cu %',
      'Zn %',
      'Pb %',
      'Fe %',
      'Sn %',
      'Grade',
      'Status',
    ];
    values = rows.map((r) => [
      displayDate(r.date),
      r.shift,
      r.furnaceNo,
      r.heatNo,
      r.startTime,
      r.readyTime,
      meltingMinutes(r.startTime, r.readyTime),
      totalCharge(r.materials),
      r.materials.map((m) => m.material + ': ' + m.kg + ' kg').join('; '),
      r.cu,
      r.zn,
      r.pb,
      r.fe,
      r.sn,
      r.grade,
      r.status,
    ]);
  } else if (entity === 'billets') {
    headers = ['Date', 'Heat', 'Company', 'Grade', 'Size', 'Billets received', 'Weight kg'];
    values = rows.map((r) => [
      displayDate(r.date),
      heatNumber(r, data),
      r.company,
      r.grade,
      r.size,
      r.count,
      r.totalKg,
    ]);
  } else if (entity === 'plans') {
    headers = [
      'Date',
      'Order',
      'Company',
      'Shape',
      'Grade',
      'Dimensions',
      'Planned kg',
      'Actual kg',
      'Priority',
      'Status',
    ];
    values = rows.map((r) => [
      displayDate(r.date),
      r.orderName,
      r.company,
      r.rodType,
      r.grade,
      sizeLabel(r),
      r.plannedKg,
      data.outputs.filter((o) => o.planId === r.id).reduce((s, o) => s + o.actualKg, 0),
      r.priority,
      r.status,
    ]);
  } else {
    headers = [
      'Date',
      'Order',
      'Company',
      'Grade',
      'Shape',
      'Size',
      'Billets used',
      'Billet size consumed',
      'Actual kg',
      'Scrap kg',
      'Recovery %',
    ];
    values = rows.map((r) => [
      displayDate(r.date),
      data.plans.find((p) => p.id === r.planId)?.orderName || 'Manual',
      r.company,
      r.grade,
      r.rodType,
      sizeLabel(r),
      r.billetsUsed,
      stockSizes.get(r.stockKey) || '',
      r.actualKg,
      r.scrapKg,
      recovery(r.actualKg, r.scrapKg),
    ]);
  }
  const blob = new Blob([csvContent(headers, values)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'brassworks-' + entity + '-' + factoryToday() + '.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast.success('Exported ' + rows.length + ' matching records');
}

export function ListActions({ entity, query }) {
  const { data, refresh, loading } = useFactory();
  const location = useLocation();
  return (
    <>
      <Button
        variant="outline"
        className="min-h-12"
        disabled={!data}
        onClick={() => exportRows(entity, query.rows, data)}
      >
        <Icon name="Download" size={16} />
        Export CSV
      </Button>
      <Button variant="outline" className="min-h-12" onClick={() => window.print()}>
        <Icon name="Printer" size={16} />
        Print / PDF
      </Button>
      <Button
        variant="outline"
        className="min-h-12"
        disabled={loading}
        onClick={() =>
          refresh()
            .then(() => toast.success('Records refreshed'))
            .catch((e) => toast.error(message(e)))
        }
      >
        <Icon name="RefreshCw" size={16} />
        Refresh
      </Button>
      <Button asChild className="min-h-12">
        <Link
          to={routes[entity] + '/new'}
          state={{ returnTo: location.pathname + location.search }}
        >
          <Icon name="Plus" size={17} />
          {entity === 'heats'
            ? 'New heat'
            : entity === 'billets'
              ? 'Add billets'
              : entity === 'plans'
                ? 'New rod plan'
                : 'Record production'}
        </Link>
      </Button>
    </>
  );
}

export function PullRefresh({ children }) {
  const { refresh } = useFactory();
  const start = useRef(null);
  const [distance, setDistance] = useState(0);
  return (
    <div
      onTouchStart={(e) => {
        if (window.scrollY === 0 && !e.target.closest('input,button,select,a,textarea'))
          start.current = e.touches[0].clientY;
      }}
      onTouchMove={(e) => {
        if (start.current != null) setDistance(Math.max(0, e.touches[0].clientY - start.current));
      }}
      onTouchEnd={() => {
        if (distance > 85)
          refresh()
            .then(() => toast.success('Records refreshed'))
            .catch((e) => toast.error(message(e)));
        start.current = null;
        setDistance(0);
      }}
      onTouchCancel={() => {
        start.current = null;
        setDistance(0);
      }}
    >
      {distance > 40 && (
        <p className="mb-3 text-center text-xs text-muted-foreground">
          {distance > 85 ? 'Release to refresh' : 'Pull to refresh'}
        </p>
      )}
      {children}
    </div>
  );
}
