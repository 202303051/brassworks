import BilletForm from '@/features/factory/BilletForm';

export const route = { path: '/billets/:id/edit', layout: 'public', access: 'public' };

export default function EditRecord() {
  return <BilletForm />;
}
