import RecordView from '@/features/factory/RecordView';

export const route = { path: '/output/:id', layout: 'public', access: 'public' };

export default function Detail() {
  return <RecordView entity="outputs" />;
}
