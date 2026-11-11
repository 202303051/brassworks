export const phases = [
  {
    number: '00',
    name: 'Foundation',
    description: 'Workspace, navigation, design tokens and handoff.',
    status: 'Current phase',
  },
  {
    number: '01',
    name: 'Factory demo',
    description: 'All four sections, calculations, filters and local demo workflows.',
    status: 'Awaiting your instruction',
  },
  {
    number: '02',
    name: 'Database',
    description: 'Schema, stock integrity, audit triggers and policy tests.',
    status: 'Not started',
  },
  {
    number: '03',
    name: 'Authentication',
    description: 'Invitations, verification, reset, MFA and session controls.',
    status: 'Not started',
  },
  {
    number: '04',
    name: 'Roles & live data',
    description: 'Role enforcement, user administration and cloud records.',
    status: 'Not started',
  },
  {
    number: '05',
    name: 'Security hardening',
    description: 'Validation, export protection, audit review and backup checks.',
    status: 'Not started',
  },
  {
    number: '06',
    name: 'Release pipeline',
    description: 'Builds, deployment, update policy and distribution.',
    status: 'Not started',
  },
  {
    number: '07',
    name: 'Acceptance & release',
    description: 'End-to-end tests, device checks, training and go-live review.',
    status: 'Not started',
  },
  {
    number: '08',
    name: 'Hardening loop',
    description: 'Repeat regression and owned-staging attack tests.',
    status: 'Not started',
  },
];

export const departments = {
  furnace: {
    number: '01',
    name: 'Furnace department',
    icon: 'Flame',
    subtitle: 'Every charge. Every heat. Every composition.',
    description:
      'The starting point for traceable brass production: record the melt, its raw materials and its final spectro reading together.',
    sections: [
      {
        title: 'Heat & timing',
        detail:
          'Date, shift, furnace, unique heat number, start time and full-liquid time. Melting duration will be calculated from the recorded times.',
      },
      {
        title: 'Raw materials',
        detail:
          'Multiple material rows per heat, with material type, weight in kg and a calculated total charge.',
      },
      {
        title: 'Spectro results',
        detail:
          'Cu, Zn, Pb, Fe and Sn percentages, target grade and Pass / Correction Done status. The percentage total must stay within 100%.',
      },
      {
        title: 'Furnace log',
        detail:
          'Search, date filters, expandable material and spectro detail, sorting, pagination, editing and confirmed deletion.',
      },
    ],
    handoff: 'A heat number will connect furnace records to billet production.',
  },
  production: {
    number: '02',
    name: 'Production department',
    icon: 'Factory',
    subtitle: 'Billets in. Orders planned. Rods out.',
    description:
      'Follow material through billet inventory, daily rod planning and finished production in one department with three sections.',
    sections: [
      {
        title: 'Section 2 · Billets & inventory',
        detail:
          'Daily billet entries and availability grouped by company, size and grade. Today’s count and all-time available stock will be shown separately.',
      },
      {
        title: 'Section 3 · Rod planning',
        detail:
          'Round, Hexa, Octa and Hollow plans, dimensions, target kg, company and priority. Planned → In Production → Completed.',
      },
      {
        title: 'Section 4 · Finished rods',
        detail:
          'Link a plan, select the matching billet stock, record billets used, actual kg and scrap. Consumption must never exceed available stock.',
      },
      {
        title: 'Stock & recovery',
        detail:
          'Compare planned and actual kg, billet consumption and net recovery. Cloud stock checks must be enforced server-side before live use.',
      },
    ],
    handoff: 'Finished production will consume stock from the matching billet group.',
  },
};
