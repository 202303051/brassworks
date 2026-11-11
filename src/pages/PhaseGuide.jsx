import { Link } from 'react-router-dom';
import Icon from '@/components/Icon';
import { Button } from '@/components/ui/button';

export const route = { path: '/phase-guide', layout: 'public', access: 'public' };

const phases = [
  ['00', 'Foundation', 'Complete', 'Project, navigation, design and GitHub source history.'],
  [
    '01',
    'Factory demo',
    'Complete',
    'Four sections, entry forms, calculations, inventory checks, filters and exports.',
  ],
  [
    '02',
    'Database',
    'Current phase',
    'PostgreSQL migrations, database-enforced stock integrity and row-security tests.',
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
          <Icon name="ArrowLeft" size={17} />
          Back to Home
        </Link>
      </Button>
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        Build record / Phase 2
      </p>
      <h1 className="mt-3 font-heading text-5xl font-bold uppercase sm:text-6xl">
        Database foundation.
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
        The factory workflows still run as a browser-local demo with no login. This version adds
        PostgreSQL migrations, stock safeguards and database tests in the source repository. Cloud
        data connection and authentication arrive in later phases.
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
            <Icon name="CodeXml" size={17} />
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
              (index === '02' ? 'bg-highlight/10' : '')
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
      <p className="mt-6 text-sm font-semibold">Authentication is the next phase.</p>
      <p className="mt-3 text-xs leading-6 text-muted-foreground">
        Run the standalone app locally with npm install and npm run dev. No builder account is
        required.
      </p>
    </div>
  );
}
