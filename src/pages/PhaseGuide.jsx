import { Link } from 'react-router-dom';
import ApperIcon from '@/components/ApperIcon';
import { Button } from '@/components/ui/button';

export const route = { path: '/phase-guide', layout: 'public', access: 'public' };

const phases = [
  ['00', 'Foundation', 'Complete', 'Project, navigation, design and GitHub source history.'],
  [
    '01',
    'Factory demo',
    'Current phase',
    'Four sections, entry forms, calculations, inventory checks, filters and exports.',
  ],
  [
    '02',
    'Database',
    'Not started',
    'Cloud schema, database-enforced stock integrity and row-security tests.',
  ],
  [
    '03',
    'Authentication',
    'Not started',
    'Invite-only access, verification, reset, MFA and sessions.',
  ],
  [
    '04',
    'Roles & live data',
    'Not started',
    'User administration, permissions and shared cloud records.',
  ],
  ['05', 'Security hardening', 'Not started', 'Audit, validation, backup and security review.'],
  ['06', 'Release pipeline', 'Not started', 'Build, deployment and distribution setup.'],
  [
    '07',
    'Acceptance & release',
    'Not started',
    'End-to-end checks, device acceptance and training.',
  ],
  ['08', 'Hardening loop', 'Not started', 'Repeated regression and owned-staging security checks.'],
];

export default function PhaseGuide() {
  return (
    <div className="mx-auto max-w-5xl">
      <Button asChild variant="ghost" className="mb-5 min-h-12 px-0">
        <Link to="/">
          <ApperIcon name="ArrowLeft" size={17} />
          Back to Home
        </Link>
      </Button>
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        Build record / Phase 1
      </p>
      <h1 className="mt-3 font-heading text-5xl font-bold uppercase sm:text-6xl">
        Test the factory flow.
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
        This phase is a browser-local demo with no login. Cloud sharing, production permissions and
        native Android/iOS builds are not included in this Apper web phase.
      </p>
      <section className="mt-7 rounded-lg border border-border bg-card p-5 sm:p-7">
        <h2 className="font-heading text-3xl font-semibold">Your test checklist</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-7 text-muted-foreground">
          <li>Record a heat, add two raw materials and check melting time and Zn balance.</li>
          <li>Receive billets for a company, grade and size; check the grouped stock summary.</li>
          <li>Create Round, Hexa, Octa and Hollow plans and try the status cycle.</li>
          <li>Record finished production and check that the matching billet stock falls.</li>
          <li>Edit and delete production; verify that stock is recalculated.</li>
          <li>Try an excessive billet consumption, invalid weight or spectro total above 100%.</li>
          <li>Try date filters, search, sorting, pagination, CSV and Print / PDF.</li>
          <li>Refresh or reopen this browser; check that your saved records remain.</li>
        </ol>
        <Button asChild variant="outline" className="mt-5 min-h-12">
          <a
            href="https://github.com/202303051/brassworks"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ApperIcon name="Github" size={17} />
            Application source on GitHub
          </a>
        </Button>
      </section>
      <div className="mt-7 overflow-hidden rounded-lg border border-border bg-card">
        {phases.map(([index, title, status, description]) => (
          <section
            key={index}
            className={
              'flex gap-4 border-b border-border p-5 last:border-b-0 ' +
              (index === '01' ? 'bg-highlight/10' : '')
            }
          >
            <span className="font-heading text-4xl font-semibold text-muted-foreground/60">
              {index}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-heading text-2xl font-semibold">{title}</h2>
                <span className="text-xs font-semibold text-muted-foreground">{status}</span>
              </div>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
          </section>
        ))}
      </div>
      <p className="mt-6 text-sm font-semibold">
        Phase 2 starts only after you reply “DONE, next phase”.
      </p>
      <p className="mt-3 text-xs leading-6 text-muted-foreground">
        The original brief and detailed internal reports remain in the Apper project source.
      </p>
    </div>
  );
}
