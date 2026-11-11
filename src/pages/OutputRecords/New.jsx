import OutputForm from '@/features/factory/OutputForm';

export const route = { path: '/output/new', layout: 'public', access: 'public' };

export default function NewRecord() {
  return <OutputForm />;
}
