import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Icon from '@/components/Icon';

export const route = { path: '/privacy', layout: 'public', access: 'public' };

const notes = [
  [
    'Browser-local demo',
    'The four factory sections use sample records and data entered in this browser. They are not shared with other phones or saved to a cloud factory database in this demo. Use fake data for testing.',
  ],
  [
    'Persistence and reset',
    'Demo records are saved in browser storage. Clearing the site’s browser data removes them. Reset demo replaces this browser’s records and added master options with fresh sample data. Export records you want to keep before resetting.',
  ],
  [
    'Exports',
    'CSV downloads and printing are generated from the records and filters you select. Exported files remain on the device where you save them.',
  ],
  [
    'Standalone application',
    'The app runs from your local development server or your chosen web host. It uses system fonts and does not load a builder SDK or make requests to a builder service.',
  ],
  [
    'Account access',
    'The demo screens require no login. The database source defines row-security policies, the 20-active-user limit and audit controls. Connecting real invitations, login and shared data to this demo belongs to later phases.',
  ],
  [
    'Source and internal documents',
    'The owner selected a public GitHub repository for application code. The original factory brief and prior detailed internal project reports are excluded from the public source. Application source, setup instructions and database tests are saved on GitHub.',
  ],
];

export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl">
      <Button asChild variant="ghost" className="mb-6 min-h-12 px-0">
        <Link to="/">
          <Icon name="ArrowLeft" size={17} />
          Back to Home
        </Link>
      </Button>
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        Data & access / Phase 2
      </p>
      <h1 className="mt-3 font-heading text-5xl font-bold uppercase sm:text-6xl">
        Where your demo data lives.
      </h1>
      <div className="mt-7 divide-y divide-border rounded-lg border border-border bg-card px-6">
        {notes.map(([title, body]) => (
          <section key={title} className="py-6">
            <h2 className="font-heading text-2xl font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
