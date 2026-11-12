import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Icon from '@/components/Icon';

export const route = { path: '/privacy', layout: 'public', access: 'public' };

const notes = [
  [
    'Spectro photo scanning',
    'Photos are read on your device to suggest chemistry percentages. They are not sent to an external AI service or saved with the heat. Review every reading against the report before applying it. Only the values you apply and save become part of the browser-local heat record.',
  ],
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
    'One factory workspace',
    'Furnace operations, billets, rod planning and finished production share the same app and navigation. Completed features appear together as the app is updated.',
  ],
  [
    'Account access',
    'The unconnected demo opens without signing in. When the owner connects factory accounts, sign-in and reset requests go to the configured Supabase project. Sessions are stored in this tab; administrators must use an authenticator. Account access does not yet move factory records to the cloud or share them across devices.',
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
        Data & privacy
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
