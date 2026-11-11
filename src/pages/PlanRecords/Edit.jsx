import PlanForm from '@/features/factory/PlanForm';

export const route = { path: '/plans/:id/edit', layout: 'public', access: 'public' };

export default function EditRecord() {
  return <PlanForm />;
}
