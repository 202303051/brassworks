import DepartmentBrief from '@/components/DepartmentBrief';
import { departments } from '@/content/phase-plan';

export const route = { path: '/departments/production', layout: 'public', access: 'public' };

export default function Production() {
  return <DepartmentBrief department={departments.production} />;
}
