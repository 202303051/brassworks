import { Suspense, lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import PublicLayout from '@/layouts/PublicLayout';
import PageSkeleton from '@/components/PageSkeleton';

const page = (load) => {
  const Component = lazy(load);
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Component />
    </Suspense>
  );
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: page(() => import('@/pages/Home')) },
      { path: 'departments/furnace', element: page(() => import('@/pages/Furnace')) },
      { path: 'departments/production', element: page(() => import('@/pages/Production')) },
      { path: 'production/planning', element: page(() => import('@/pages/Planning')) },
      { path: 'production/finished', element: page(() => import('@/pages/Finished')) },
      { path: 'phase-guide', element: page(() => import('@/pages/PhaseGuide')) },
      { path: 'privacy', element: page(() => import('@/pages/Privacy')) },
      { path: 'furnace/new', element: page(() => import('@/pages/FurnaceRecords/New')) },
      { path: 'furnace/:id', element: page(() => import('@/pages/FurnaceRecords/Detail')) },
      { path: 'furnace/:id/edit', element: page(() => import('@/pages/FurnaceRecords/Edit')) },
      { path: 'billets/new', element: page(() => import('@/pages/BilletRecords/New')) },
      { path: 'billets/:id', element: page(() => import('@/pages/BilletRecords/Detail')) },
      { path: 'billets/:id/edit', element: page(() => import('@/pages/BilletRecords/Edit')) },
      { path: 'plans/new', element: page(() => import('@/pages/PlanRecords/New')) },
      { path: 'plans/:id', element: page(() => import('@/pages/PlanRecords/Detail')) },
      { path: 'plans/:id/edit', element: page(() => import('@/pages/PlanRecords/Edit')) },
      { path: 'output/new', element: page(() => import('@/pages/OutputRecords/New')) },
      { path: 'output/:id', element: page(() => import('@/pages/OutputRecords/Detail')) },
      { path: 'output/:id/edit', element: page(() => import('@/pages/OutputRecords/Edit')) },
      { path: '*', element: page(() => import('@/pages/NotFound')) },
    ],
  },
]);
