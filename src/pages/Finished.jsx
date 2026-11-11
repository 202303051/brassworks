import { FinishedLog } from '@/features/factory/lists';

export const route = { path: '/production/finished', layout: 'public', access: 'public' };

export default function Finished() {
  return <FinishedLog />;
}
