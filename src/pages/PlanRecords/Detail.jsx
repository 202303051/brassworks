import RecordView from '@/features/factory/RecordView';

export const route = { path: '/plans/:id', layout: 'public', access: 'public' };

export default function Detail() {
  return <RecordView entity="plans" />;
}
