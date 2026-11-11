import { Link } from 'react-router-dom';
import ApperIcon from '@/components/ApperIcon';
import { Button } from '@/components/ui/button';

export const route = { path: '/privacy', layout: 'public', access: 'public' };
export const nav = { label: 'Privacy', icon: 'Shield', order: 30, profiles: null };

const notes = [
  [
    'Current scope',
    'The Phase 0 screens contain project documentation only. Do not enter real factory, employee, customer or order information into platform demo features.',
  ],
  [
    'Hosting and preferences',
    'Apper operates the hosting and may process technical access logs under its own terms. The platform stores your theme preference in the browser. This scaffold adds no analytics, business-record storage or token storage.',
  ],
  [
    'Fonts',
    'The theme requests Barlow Condensed and Manrope from Google Fonts. That service receives the network information needed to deliver the fonts. System fonts are used if the request fails.',
  ],
  [
    'Access',
    'The Apper project was created as Private. These documentation routes are public within the app router, without an application login. Private project visibility is not a substitute for future authentication or row security.',
  ],
  [
    'Before live use',
    'Invitations, role permissions, the 20-active-user cap, audit controls, retention, export and deletion procedures must be implemented and verified before real data is connected.',
  ],
];

export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl">
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
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        Data & access
      </p>
      <h1 className="mt-3 font-heading text-5xl font-bold uppercase sm:text-6xl">
        Privacy at this phase
      </h1>
      <p className="mt-5 leading-7 text-muted-foreground">
        A clear record of what this scaffold does today and what must be in place before the factory
        goes live.
      </p>
      <div className="mt-8 divide-y divide-border rounded-lg border border-border bg-card px-6">
        {notes.map(([title, detail]) => (
          <section key={title} className="py-6">
            <h2 className="font-heading text-2xl font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{detail}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
