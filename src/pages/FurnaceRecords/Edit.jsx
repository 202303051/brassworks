import FurnaceForm from '@/features/factory/FurnaceForm';

export const route = { path: '/furnace/:id/edit', layout: 'public', access: 'public' };

export default function EditRecord() {
  return <FurnaceForm />;
}
