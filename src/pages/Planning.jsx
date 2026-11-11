import { PlanningLog } from '@/features/factory/lists';

export const route = { path: '/production/planning', layout: 'public', access: 'public' };

export default function Planning() {
  return <PlanningLog />;
}
