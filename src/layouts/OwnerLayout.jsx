import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useOwnerLayoutData } from '@/hooks/useOwnerLayoutData';
import { APP_CONFIG } from '@/config/app.config';
import { cn } from '@/lib/utils';
import ApperIcon from '@/components/ApperIcon';
import UserMenu from '@/components/UserMenu';
import { ErrorBoundary } from '@/components/ui/error-boundary';

export default function OwnerLayout() {
  const { user, logout, homeRoute, navItems, navGroups, initials, displayName, counts } =
    useOwnerLayoutData();
  const [navOpen, setNavOpen] = useState(false);
  const groups = navGroups.length ? navGroups : [{ label: null, items: navItems }];

  const navigation = groups.map((group, index) => (
    <div key={group.label ?? index} className="flex flex-wrap items-center gap-3">
      {group.items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          onClick={() => setNavOpen(false)}
          className={({ isActive }) =>
            cn(
              'flex min-h-12 items-center gap-2 border-b-2 px-3 text-sm font-semibold',
              isActive
                ? 'border-primary text-sidebar-foreground'
                : 'border-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            )
          }
        >
          <ApperIcon name={item.icon ?? 'Circle'} size={18} />
          <span>{item.label}</span>
          {counts[item.to] != null && <span>{counts[item.to]}</span>}
        </NavLink>
      ))}
    </div>
  ));

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Link
            to={homeRoute}
            className="flex min-h-12 items-center gap-2 font-heading text-3xl font-bold uppercase"
          >
            <ApperIcon name={APP_CONFIG.icon} size={24} />
            {APP_CONFIG.name}
          </Link>
          <nav aria-label="Team navigation" className="hidden flex-1 gap-3 md:flex">
            {navigation}
          </nav>
          <button
            type="button"
            aria-label="Toggle team navigation"
            aria-expanded={navOpen}
            aria-controls="team-mobile-navigation"
            onClick={() => setNavOpen((value) => !value)}
            className="ml-auto flex min-h-12 min-w-12 items-center justify-center rounded-md hover:bg-sidebar-accent md:hidden"
          >
            <ApperIcon name={navOpen ? 'X' : 'Menu'} size={22} />
          </button>
          <UserMenu user={user} initials={initials} displayName={displayName} logout={logout} />
        </div>
        {navOpen && (
          <nav
            id="team-mobile-navigation"
            aria-label="Mobile team navigation"
            className="border-t border-sidebar-border px-4 md:hidden"
          >
            {navigation}
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
