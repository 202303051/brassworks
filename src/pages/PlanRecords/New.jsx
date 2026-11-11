import PlanForm from '@/features/factory/PlanForm';

export const route = { path: '/plans/new', layout: 'public', access: 'public' };

export default function NewRecord() {
  return <PlanForm />;
}
