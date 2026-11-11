import { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import Icon from '@/components/Icon';
import { useFactory } from './FactoryProvider';
import { PLAN_STATUSES } from './model';
import { Badge, Confirm, message, recordTitle, routes } from './ui';

export function DeleteRecord({ entity, row, onDeleted }) {
  const { save } = useFactory();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        className="min-h-12 text-destructive hover:text-destructive"
        onClick={() => setOpen(true)}
        aria-label={'Delete ' + recordTitle(entity, row)}
      >
        <Icon name="Trash2" size={16} />
        <span>Delete</span>
      </Button>
      <Confirm
        open={open}
        onOpenChange={setOpen}
        title={'Delete ' + recordTitle(entity, row) + '?'}
        description="This removes the demo record. Changes that would break linked records or make billet stock negative are blocked."
        actionLabel="Delete record"
        danger
        action={async () => {
          await save({ type: 'delete', entity, id: row.id });
          toast.success('Record deleted');
          onDeleted?.();
        }}
      />
    </>
  );
}

export function EditRecord({ entity, row }) {
  const location = useLocation();
  return (
    <Button variant="outline" asChild className="min-h-12">
      <Link
        to={routes[entity] + '/' + row.id + '/edit'}
        state={{ returnTo: location.state?.returnTo || location.pathname + location.search }}
      >
        <Icon name="Pencil" size={15} />
        Edit
      </Link>
    </Button>
  );
}

export function PlanStatus({ row }) {
  const { save } = useFactory();
  const [open, setOpen] = useState(false);
  const [optimistic, setOptimistic] = useState(null);
  const [pending, setPending] = useState(false);
  const locked = useRef(false);
  const next = PLAN_STATUSES[(PLAN_STATUSES.indexOf(row.status) + 1) % PLAN_STATUSES.length];
  async function commit() {
    if (locked.current) return;
    locked.current = true;
    setPending(true);
    setOptimistic(next);
    try {
      await save({ type: 'status', entity: 'plans', id: row.id, status: next });
      toast.success('Plan moved to ' + next);
    } finally {
      setPending(false);
      setOptimistic(null);
      locked.current = false;
    }
  }
  const status = optimistic || row.status;
  return (
    <>
      <button
        type="button"
        className="flex min-h-12 items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
        disabled={pending}
        aria-label={'Move ' + row.orderName + ' to ' + next}
        onClick={() => {
          if (row.status === 'Planned') commit().catch((e) => toast.error(message(e)));
          else setOpen(true);
        }}
      >
        <Badge
          tone={status === 'Completed' ? 'good' : status === 'In Production' ? 'brand' : 'neutral'}
        >
          {status}
        </Badge>
        <Icon
          name={pending ? 'LoaderCircle' : 'ArrowRight'}
          size={14}
          className={pending ? 'animate-spin' : ''}
        />
      </button>
      <Confirm
        open={open}
        onOpenChange={setOpen}
        title={
          next === 'Completed' ? 'Complete ' + row.orderName + '?' : 'Reopen ' + row.orderName + '?'
        }
        description={
          'Move this plan to ' +
          next +
          '. Existing production records and billet consumption are kept.'
        }
        actionLabel={next === 'Completed' ? 'Mark completed' : 'Reopen plan'}
        action={commit}
      />
    </>
  );
}
