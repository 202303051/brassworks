import { Link } from 'react-router-dom';
import ApperIcon from '@/components/ApperIcon';
import { Button } from '@/components/ui/button';
import { departments } from '@/content/phase-plan';

export const route = { path: '/', layout: 'public', access: 'public' };
export const nav = { label: 'Workspace', icon: 'Factory', order: 10, profiles: null };

const process = [
  { label: 'Charge & melt', note: 'Furnace', icon: 'Flame' },
  { label: 'Cast billets', note: 'Inventory', icon: 'Layers3' },
  { label: 'Plan the run', note: 'Planning', icon: 'ClipboardList' },
  { label: 'Finish & recover', note: 'Production', icon: 'PackageCheck' },
];

export default function Home() {
  return (
    <div>
      <section className="grid gap-8 border-b border-border pb-10 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Your factory. In one place.
          </p>
          <h1 className="mt-5 font-heading text-6xl font-bold uppercase leading-[0.95] tracking-tight sm:text-8xl">
            One floor.
            <br />
            <span className="text-muted-foreground">Two departments.</span>
          </h1>
          <p className="mt-6 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
            A shared foundation for every heat, billet and finished rod. Start with a department to
            review its scope, or open the guide to inspect this phase.
          </p>
        </div>
        <aside className="self-end rounded-lg border border-border bg-card p-6">
          <div className="flex items-start justify-between gap-4">
            <span className="font-heading text-5xl font-semibold leading-none">
              00<span className="text-2xl text-muted-foreground"> / 08</span>
            </span>
            <span className="rounded-md bg-highlight/10 px-3 py-1 text-xs font-bold text-highlight">
              Foundation
            </span>
          </div>
          <h2 className="mt-5 font-heading text-2xl font-semibold">
            Built in phases. Reviewed by you.
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            This is the project scaffold. Data entry begins in Phase 1; live access and security
            arrive in later phases.
          </p>
          <Button asChild className="mt-5 min-h-12 w-full">
            <Link to="/phase-guide">
              Review Phase 0
              <ApperIcon name="ArrowRight" size={18} />
            </Link>
          </Button>
        </aside>
      </section>

      <section className="py-9">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-heading text-3xl font-semibold uppercase">The departments</h2>
          <p className="text-xs font-semibold text-muted-foreground">
            Two entry points. One production chain.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {Object.entries(departments).map(([key, department]) => (
            <Link
              key={key}
              to={`/departments/${key}`}
              className="group relative flex min-h-64 flex-col rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring sm:p-8"
            >
              <div className="flex items-center justify-between">
                <span className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-foreground">
                  <ApperIcon name={department.icon} size={26} />
                </span>
                <span className="font-heading text-4xl font-semibold text-muted-foreground/50">
                  {department.number}
                </span>
              </div>
              <h3 className="mt-6 font-heading text-4xl font-semibold uppercase">
                {department.name}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{department.subtitle}</p>
              <div className="mt-7 flex items-center justify-between border-t border-border pt-4">
                <span className="text-xs font-bold uppercase tracking-widest">
                  Explore department scope
                </span>
                <ApperIcon
                  name="ArrowUpRight"
                  size={22}
                  className="transition-transform motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5"
                />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            The material journey · Planned workflow
          </h2>
        </div>
        <ol className="grid divide-y divide-border sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4">
          {process.map((step, index) => (
            <li key={step.label} className="flex items-center gap-4 p-6">
              <span className="font-heading text-3xl font-semibold text-muted-foreground/50">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {step.note}
                </p>
                <p className="mt-1 font-heading text-xl font-semibold">{step.label}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
        <ApperIcon name="Info" size={16} className="mt-0.5 shrink-0" />
        No factory data is collected in this phase. The 20-user cap, stock protection and production
        security controls are future work.
      </p>
    </div>
  );
}
