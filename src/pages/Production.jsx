import { BilletLog } from '@/features/factory/lists';

export const route = { path: '/departments/production', layout: 'public', access: 'public' };
export const nav = { label: 'Production', icon: 'Factory', order: 30, profiles: null };

export default function Production() {
  return <BilletLog />;
}
