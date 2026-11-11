import DepartmentBrief from '@/components/DepartmentBrief';
import { departments } from '@/content/phase-plan';

export const route = { path: '/departments/furnace', layout: 'public', access: 'public' };

export default function Furnace() {
  return <DepartmentBrief department={departments.furnace} />;
}
