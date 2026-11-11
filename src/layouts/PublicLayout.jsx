import { Link, Outlet, useLocation } from 'react-router-dom';
import { APP_CONFIG } from '@/config/app.config';
import ApperIcon from '@/components/ApperIcon';
import ThemeToggle from '@/components/ThemeToggle';
import FactoryClock from '@/components/FactoryClock';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { FactoryProvider } from '@/features/factory/FactoryProvider';
import { ResetDemoButton } from '@/features/factory/ui';
import '@/features/factory/print.css';

const links = [
  { to: '/', label: 'Home', active: (path) => path === '/' },
  {
    to: '/departments/furnace',
    label: 'Furnace',
    active: (path) => path.startsWith('/departments/furnace') || path.startsWith('/furnace/'),
  },
  {
    to: '/departments/production',
    label: 'Production',
    active: (path) =>
      path.startsWith('/departments/production') ||
      path.startsWith('/production/') ||
      path.startsWith('/billets/') ||
      path.startsWith('/plans/') ||
      path.startsWith('/output/'),
  },
  { to: '/phase-guide', label: 'Phase guide', active: (path) => path === '/phase-guide' },
];

function Shell() {
  const { pathname } = useLocation();
  return (
    <div className="min-h-svh bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-md focus:bg-primary focus:p-4 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <header className="border-b border-sidebar-border bg-sidebar text-sidebar-foreground print:hidden">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <Link
            to="/"
            className="flex min-h-12 items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-ring"
          >
            <span className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ApperIcon name={APP_CONFIG.icon} size={25} />
            </span>
            <span>
              <span className="block font-heading text-3xl font-bold uppercase leading-none tracking-wide">
                {APP_CONFIG.name}
              </span>
              <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Factory management
              </span>
            </span>
          </Link>
          <div className="order-2 ml-auto">
            <ThemeToggle className="[&_button]:min-h-12 [&_button]:min-w-12" />
          </div>
          <nav
            aria-label="Main navigation"
            className="order-3 flex w-full items-center gap-5 overflow-x-auto sm:order-1 sm:mx-auto sm:w-auto"
          >
            {links.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                aria-current={item.active(pathname) ? 'page' : undefined}
                className={
                  'flex min-h-12 shrink-0 items-center border-b-2 px-1 text-sm font-bold focus-visible:outline-2 focus-visible:outline-ring ' +
                  (item.active(pathname)
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:border-sidebar-border hover:text-foreground')
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <div className="border-b border-border print:hidden">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-1 sm:px-8">
          <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
            <span className="size-2 rounded-full bg-highlight" aria-hidden="true" />
            Phase 01 <span className="text-muted-foreground">/ Browser-local demo</span>
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <FactoryClock />
            <ResetDemoButton />
          </div>
        </div>
      </div>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-7xl px-4 py-7 outline-none [overflow-wrap:anywhere] sm:px-8 sm:py-9"
      >
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <footer className="mt-8 border-t border-border print:hidden">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs leading-6 text-muted-foreground sm:px-8">
          <p>
            Demo data stays in this browser. Cloud sharing and access controls arrive in later
            phases.
          </p>
          <Link
            to="/privacy"
            className="inline-flex min-h-12 items-center underline hover:text-foreground"
          >
            Privacy & data
          </Link>
        </div>
      </footer>
    </div>
  );
}

export default function PublicLayout() {
  return (
    <FactoryProvider>
      <Shell />
    </FactoryProvider>
  );
}
