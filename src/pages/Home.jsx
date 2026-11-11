import { Link } from 'react-router-dom';
import Icon from '@/components/Icon';
import { Button } from '@/components/ui/button';
import { useFactory } from '@/features/factory/FactoryProvider';
import { factoryToday, inventory } from '@/features/factory/model';
import { Badge, number, PageState } from '@/features/factory/ui';

export const route = { path: '/', layout: 'public', access: 'public' };
export const nav = { label: 'Home', icon: 'Factory', order: 10, profiles: null };

export default function Home() {
  const { data } = useFactory();
  const today = factoryToday();
  const heats = data?.heats.filter((row) => row.date === today) || [];
  const plans = data?.plans.filter((row) => row.date === today) || [];
  const produced =
    data?.outputs.filter((row) => row.date === today).reduce((sum, row) => sum + row.actualKg, 0) ||
    0;
  const available = data ? inventory(data).reduce((sum, row) => sum + row.available, 0) : 0;
  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            From charge to finished rod
          </p>
          <h1 className="mt-3 font-heading text-5xl font-bold uppercase leading-none sm:text-7xl">
            Your factory.
            <br />
            <span className="text-muted-foreground">One clear picture.</span>
          </h1>
        </div>
        <div className="max-w-sm">
          <Badge tone="brand">Phase 1 · Demo workflows</Badge>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Test every entry, calculation and stock movement without signing in. Sample data and
            your changes are saved in this browser.
          </p>
        </div>
      </div>
      <PageState>
        <div className="mb-8 grid grid-cols-2 divide-x divide-border overflow-hidden rounded-lg border border-border bg-card py-5 lg:grid-cols-4">
          {[
            ['Heats today', heats.length, ''],
            ['Billets available', available, ''],
            ['Planned today', plans.reduce((s, row) => s + row.plannedKg, 0), 'kg'],
            ['Rods today', produced, 'kg'],
          ].map(([label, value, unit]) => (
            <div key={label} className="px-5 py-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {label}
              </p>
              <p className="mt-2 font-heading text-4xl font-semibold tabular-nums">
                {number(value)}
                <span className="ml-1.5 text-base text-muted-foreground">{unit}</span>
              </p>
            </div>
          ))}
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Link
            to="/departments/furnace"
            className="group rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring sm:p-8"
          >
            <div className="flex items-center justify-between">
              <span className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
                <Icon name="Flame" size={26} />
              </span>
              <span className="font-heading text-4xl text-muted-foreground/50">01</span>
            </div>
            <h2 className="mt-6 font-heading text-4xl font-semibold uppercase">
              Furnace department
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Heat timing, raw-material charge and final spectro. Keep each melt together from start
              to liquid ready.
            </p>
            <div className="mt-6 flex min-h-12 items-center justify-between border-t border-border pt-4">
              <span className="text-xs font-bold uppercase tracking-widest">Open furnace log</span>
              <Icon name="ArrowUpRight" size={22} />
            </div>
          </Link>
          <Link
            to="/departments/production"
            className="group rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring sm:p-8"
          >
            <div className="flex items-center justify-between">
              <span className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
                <Icon name="Factory" size={26} />
              </span>
              <span className="font-heading text-4xl text-muted-foreground/50">02–04</span>
            </div>
            <h2 className="mt-6 font-heading text-4xl font-semibold uppercase">
              Production department
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Receive billets, plan rod runs and record finished output. See available stock change
              with production.
            </p>
            <div className="mt-6 flex min-h-12 items-center justify-between border-t border-border pt-4">
              <span className="text-xs font-bold uppercase tracking-widest">
                Open production sections
              </span>
              <Icon name="ArrowUpRight" size={22} />
            </div>
          </Link>
        </div>
        <div className="mt-7 rounded-lg border border-border bg-card p-5 sm:p-6">
          <h2 className="font-heading text-2xl font-semibold">Today’s planning at a glance</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            {plans.filter((row) => row.status !== 'Completed').length} open plans ·{' '}
            {plans.filter((row) => row.priority === 'Urgent' && row.status !== 'Completed').length}{' '}
            urgent · {number(plans.reduce((sum, row) => sum + row.plannedKg, 0))} kg planned.
          </p>
          <Button asChild variant="outline" className="mt-4 min-h-12">
            <Link to="/production/planning">
              Review rod planning
              <Icon name="ArrowRight" size={16} />
            </Link>
          </Button>
        </div>
      </PageState>
    </div>
  );
}
