import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import ApperIcon from '@/components/ApperIcon';

export const route = { path: '/privacy', layout: 'public', access: 'public' };

const notes = [
  [
    'Browser-local demo',
    'The four factory sections use sample records and data entered in this browser. They are not shared with other phones or saved to a cloud factory database in Phase 1. Use fake data for testing.',
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
    'Hosting and fonts',
    'Apper provides hosting and its runtime SDK and may process technical access logs under its terms. Google Fonts delivers the heading and body fonts. System fonts are used when those requests fail.',
  ],
  [
    'Account access',
    'The demo screens require no login. Real invitations, user roles, the 20-active-user limit, audit controls and production session security belong to later phases.',
  ],
  [
    'Source and internal documents',
    'The owner selected a public GitHub repository for application code. The original factory brief and detailed internal project reports remain in Apper and are excluded from the public source.',
  ],
];

export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl">
      <Button asChild variant="ghost" className="mb-6 min-h-12 px-0">
        <Link to="/">
          <ApperIcon name="ArrowLeft" size={17} />
          Back to Home
        </Link>
      </Button>
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        Data & access / Phase 1
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
