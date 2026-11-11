import FurnaceForm from '@/features/factory/FurnaceForm';

export const route = { path: '/furnace/new', layout: 'public', access: 'public' };

export default function NewRecord() {
  return <FurnaceForm />;
}
