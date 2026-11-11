import { FurnaceLog } from '@/features/factory/lists';

export const route = { path: '/departments/furnace', layout: 'public', access: 'public' };
export const nav = { label: 'Furnace', icon: 'Flame', order: 20, profiles: null };

export default function Furnace() {
  return <FurnaceLog />;
}
