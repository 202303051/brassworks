import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useFactory } from './FactoryProvider';
import { fieldClass, message } from './ui';

export default function SmartSelect({
  id,
  kind,
  value,
  onChange,
  onBlur,
  invalid = false,
  disabled = false,
  suffix = '',
}) {
  const { data, save } = useFactory();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const locked = useRef(false);
  async function add() {
    if (locked.current) return;
    locked.current = true;
    setPending(true);
    try {
      const next = await save({ type: 'master', kind, value: draft });
      onChange(next);
      setAdding(false);
      setDraft('');
      toast.success('Option added');
    } catch (error) {
      toast.error(message(error));
    } finally {
      setPending(false);
      locked.current = false;
    }
  }
  const options = [...new Set([...(data?.masters[kind] || []), ...(value ? [String(value)] : [])])];
  return (
    <div>
      <select
        id={id}
        className={fieldClass}
        value={value ?? ''}
        disabled={disabled}
        onBlur={onBlur}
        aria-invalid={invalid}
        aria-describedby={invalid ? id + '-error' : undefined}
        onChange={(e) => {
          if (e.target.value === '__add_new__') setAdding(true);
          else onChange(e.target.value);
        }}
      >
        <option value="">Choose an option</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
            {suffix}
          </option>
        ))}
        <option value="__add_new__">+ Add new…</option>
      </select>
      {adding && (
        <div className="mt-2 rounded-md border border-border bg-muted p-3">
          <label htmlFor={id + '-new'} className="mb-2 block text-xs font-semibold">
            Add a new option
          </label>
          <input
            id={id + '-new'}
            autoFocus
            value={draft}
            maxLength={100}
            className={fieldClass}
            placeholder={kind === 'rodSizes' ? 'e.g. 35' : 'Enter the new name or size'}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                setAdding(false);
              }
            }}
          />
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              className="min-h-12"
              disabled={pending || !draft.trim()}
              onClick={add}
            >
              {pending ? 'Adding…' : 'Add option'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-12"
              disabled={pending}
              onClick={() => setAdding(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
