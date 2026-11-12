import { lazy, Suspense } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from './AuthProvider';
import { writeEntity } from './policy';
import PageSkeleton from '@/components/PageSkeleton';
const Account = lazy(() => import('./Account'));

export default function AccessBoundary({ children }) {
  const auth = useAuth();
  const { pathname } = useLocation();
  if (['/privacy', '/account'].includes(pathname)) return children;
  if (!['demo', 'ready'].includes(auth.status))
    return (
      <Suspense fallback={<PageSkeleton />}>
        <Account />
      </Suspense>
    );
  const entity = writeEntity(pathname);
  if (
    (entity && !auth.canWrite(entity)) ||
    (pathname === '/team' && auth.profile?.role !== 'admin')
  ) {
    return (
      <section className="mx-auto max-w-lg">
        <h1 className="font-heading text-4xl font-bold">Access restricted</h1>
        <p className="my-5 text-muted-foreground">
          Your role does not allow this action. Ask your administrator if you need different access.
        </p>
        <Button asChild className="min-h-12">
          <Link to="/">Back to workspace</Link>
        </Button>
      </section>
    );
  }
  return children;
}
