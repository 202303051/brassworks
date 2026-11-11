import BilletForm from '@/features/factory/BilletForm';

export const route = { path: '/billets/new', layout: 'public', access: 'public' };

export default function NewRecord() {
  return <BilletForm />;
}
