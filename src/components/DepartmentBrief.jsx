import { Link } from 'react-router-dom';
import ApperIcon from '@/components/ApperIcon';
import { Button } from '@/components/ui/button';

export default function DepartmentBrief({ department }) {
  return (
    <div>
      <Button
        variant="ghost"
        asChild
        className="mb-6 min-h-12 px-0 hover:bg-transparent hover:underline"
      >
        <Link to="/">
          <ApperIcon name="ArrowLeft" size={18} />
          Back to Home
        </Link>
      </Button>
      <div className="grid gap-8 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
        <div>
          <span className="font-heading text-6xl font-semibold text-muted-foreground/40">
            {department.number}
          </span>
          <h1 className="mt-4 font-heading text-5xl font-bold uppercase leading-none sm:text-6xl">
            {department.name}
          </h1>
          <p className="mt-5 text-lg font-semibold">{department.subtitle}</p>
          <p className="mt-4 max-w-lg leading-relaxed text-muted-foreground">
            {department.description}
          </p>
          <div className="mt-8 rounded-lg border border-warning-border bg-warning-muted p-5">
            <p className="flex items-center gap-2 text-sm font-bold text-warning">
              <ApperIcon name="Info" size={18} />
              Workflow implementation begins in Phase 1
            </p>
            <p className="mt-2 text-sm leading-relaxed text-foreground">
              This page records the department scope. Entry forms, calculations and factory records
              are not enabled in Phase 0.
            </p>
          </div>
          <Button asChild className="mt-6 min-h-12">
            <Link to="/phase-guide">
              Review the phase guide
              <ApperIcon name="ArrowUpRight" size={18} />
            </Link>
          </Button>
        </div>
        <div>
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            The department scope
          </p>
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {department.sections.map((section, index) => (
              <section key={section.title} className="flex gap-4 p-5 sm:p-6">
                <span className="pt-1 font-heading text-2xl text-muted-foreground">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <h2 className="font-heading text-2xl font-semibold">{section.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {section.detail}
                  </p>
                </div>
              </section>
            ))}
          </div>
          <p className="mt-5 flex items-start gap-2 text-sm text-muted-foreground">
            <ApperIcon name="Link2" size={18} className="mt-0.5 shrink-0" />
            {department.handoff}
          </p>
        </div>
      </div>
    </div>
  );
}
