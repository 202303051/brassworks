import { Link, NavLink, Outlet } from 'react-router-dom';
import { APP_CONFIG } from '@/config/app.config';
import ApperIcon from '@/components/ApperIcon';
import ThemeToggle from '@/components/ThemeToggle';
import FactoryClock from '@/components/FactoryClock';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { cn } from '@/lib/utils';

const links = [
  { to: '/', label: 'Workspace' },
  { to: '/phase-guide', label: 'Phase guide' },
  { to: '/privacy', label: 'Privacy' },
];

export default function PublicLayout() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-md focus:bg-primary focus:p-4 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <header className="border-b border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-8">
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
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-12 shrink-0 items-center border-b-2 px-1 text-sm font-bold focus-visible:outline-2 focus-visible:outline-ring',
                    isActive
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:border-sidebar-border hover:text-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <div className="border-b border-border">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-8">
          <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest">
            <span className="size-2 rounded-full bg-highlight" aria-hidden="true" />
            Phase 00 <span className="text-muted-foreground">/ Foundation</span>
          </span>
          <FactoryClock />
        </div>
      </div>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-7xl px-4 py-8 outline-none sm:px-8 sm:py-12"
      >
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <footer className="mt-8 border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:px-8">
          <p>Brassworks · From the first charge to the finished rod.</p>
          <p>Phase 0 scaffold · Factory records are not enabled.</p>
        </div>
      </footer>
    </div>
  );
}
