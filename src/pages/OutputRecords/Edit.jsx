import OutputForm from '@/features/factory/OutputForm';

export const route = { path: '/output/:id/edit', layout: 'public', access: 'public' };

export default function EditRecord() {
  return <OutputForm />;
}
