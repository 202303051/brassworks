import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import ApperIcon from '@/components/ApperIcon';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useFactory } from './FactoryProvider';
import SmartSelect from './SmartSelect';
import { factoryToday, schemas } from './model';
import { Field, fieldClass, FormPanel, message, parents, RecordHeading, routes } from './ui';

export function useEntityForm(entity, defaults, prepare = (v) => v) {
  const { data, save } = useFactory();
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState(defaults);
  const [errors, setErrors] = useState({});
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState('');
  const [readyKey, setReadyKey] = useState(null);
  const loaded = useRef(null);
  const baseVersion = useRef(null);
  const submitting = useRef(false);
  const record = data?.[entity].find((r) => r.id === id);
  const key = id || 'new';
  useEffect(() => {
    if (!data || loaded.current === key) return;
    if (record) {
      const { id: recordId, createdAt, updatedAt, recordVersion, ...payload } = record;
      setForm(payload);
      baseVersion.current = recordVersion ?? 1;
    }
    loaded.current = key;
    setReadyKey(key);
  }, [data, key, record]);

  const set = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([key]) => key !== field && !key.startsWith(field + '.')),
      ),
    );
    setFailure('');
  };
  const blur = (field) => {
    const result = schemas[entity].safeParse(prepare(form));
    const issue = result.success
      ? null
      : result.error.issues.find((i) => i.path.join('.') === field);
    setErrors((current) => ({ ...current, [field]: issue?.message }));
  };
  async function submit(event, beforeSave) {
    event.preventDefault();
    if (submitting.current) return;
    const result = schemas[entity].safeParse(prepare(form));
    if (!result.success) {
      setErrors(Object.fromEntries(result.error.issues.map((i) => [i.path.join('.'), i.message])));
      setFailure('Check the marked fields. Your entries have been kept.');
      toast.error('Check the marked fields');
      return;
    }
    submitting.current = true;
    setPending(true);
    setFailure('');
    try {
      beforeSave?.(result.data);
      const saved = await save({
        type: 'save',
        entity,
        id,
        payload: result.data,
        expectedVersion: id ? baseVersion.current : undefined,
      });
      toast.success(id ? 'Changes saved' : 'Record added');
      navigate(routes[entity] + '/' + saved.id, {
        replace: true,
        state: { returnTo: location.state?.returnTo || parents[entity] },
      });
    } catch (error) {
      setFailure(message(error));
      if (error?.issues)
        setErrors(Object.fromEntries(error.issues.map((i) => [i.path.join('.'), i.message])));
      toast.error(message(error));
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }
  const candidate = location.state?.returnTo;
  const returnTo =
    typeof candidate === 'string' &&
    (candidate === parents[entity] || candidate.startsWith(parents[entity] + '?'))
      ? candidate
      : parents[entity];
  return {
    form,
    set,
    setForm,
    errors,
    blur,
    submit,
    pending,
    failure,
    id,
    record,
    returnTo,
    missing: Boolean(data && id && !record),
    ready: Boolean(data && readyKey === key && (!id || record)),
    today: factoryToday(),
  };
}

export function InputField({
  model,
  name,
  label,
  type = 'text',
  required = true,
  hint,
  min,
  max,
  step,
  placeholder,
  disabled = false,
}) {
  return (
    <Field label={label} id={name} error={model.errors[name]} required={required} hint={hint}>
      <input
        id={name}
        name={name}
        className={fieldClass}
        value={model.form[name] ?? ''}
        type={type}
        min={min}
        max={max}
        step={step}
        maxLength={type === 'text' ? 100 : undefined}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={Boolean(model.errors[name])}
        aria-describedby={model.errors[name] ? name + '-error' : undefined}
        onChange={(e) => model.set(name, e.target.value)}
        onBlur={() => model.blur(name)}
      />
    </Field>
  );
}

export function ChoiceField({ model, name, label, options }) {
  return (
    <Field label={label} id={name} error={model.errors[name]} required>
      <select
        id={name}
        className={fieldClass}
        value={model.form[name] ?? ''}
        aria-invalid={Boolean(model.errors[name])}
        onChange={(e) => model.set(name, e.target.value)}
        onBlur={() => model.blur(name)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function MasterField({ model, name, kind, label, disabled = false, suffix = '' }) {
  return (
    <Field label={label} id={name} error={model.errors[name]} required>
      <SmartSelect
        id={name}
        kind={kind}
        value={model.form[name]}
        onChange={(value) => model.set(name, value)}
        onBlur={() => model.blur(name)}
        invalid={Boolean(model.errors[name])}
        disabled={disabled}
        suffix={suffix}
      />
    </Field>
  );
}

export function FormFrame({ entity, model, title, children }) {
  if (model.missing)
    return (
      <div>
        <RecordHeading title="Record not found" back={parents[entity]} />
        <p className="text-sm text-muted-foreground">
          The record may have been deleted in another tab.
        </p>
      </div>
    );
  return (
    <div className="mx-auto max-w-5xl">
      <RecordHeading
        title={title}
        back={model.returnTo}
        eyebrow={model.id ? 'Edit factory record' : 'New factory record'}
        description="Fields marked * are required. Demo records are saved in this browser."
      />
      {!model.ready ? (
        <div className="space-y-5" aria-label="Preparing form">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : (
        children
      )}
    </div>
  );
}

export function FormFooter({ entity, model }) {
  return (
    <div className="sticky bottom-0 z-10 mt-6 border-t border-border bg-background/95 py-4 backdrop-blur">
      {model.failure && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {model.failure}
        </div>
      )}
      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" variant="outline" asChild className="min-h-12">
          <Link
            to={model.id ? routes[entity] + '/' + model.id : model.returnTo}
            state={{ returnTo: model.returnTo }}
          >
            Cancel
          </Link>
        </Button>
        <Button type="submit" className="min-h-12 min-w-40" disabled={model.pending}>
          {model.pending && <ApperIcon name="LoaderCircle" size={16} className="animate-spin" />}
          {model.pending ? 'Saving…' : model.id ? 'Save changes' : 'Save record'}
        </Button>
      </div>
    </div>
  );
}

export function ShapeField({ model }) {
  const { form, setForm } = model;
  function shape(value) {
    setForm((current) => ({
      ...current,
      rodType: value,
      innerMm: value === 'Hollow' ? current.innerMm : 0,
      dimension: ['Hexa', 'Octa'].includes(value)
        ? 'Across flats'
        : current.dimension === 'Across flats'
          ? 'Diameter'
          : current.dimension,
    }));
  }
  return (
    <Field label="Rod type" id="rodType" required>
      <select
        id="rodType"
        className={fieldClass}
        value={form.rodType}
        onChange={(e) => shape(e.target.value)}
      >
        {['Round', 'Hexa', 'Octa', 'Hollow'].map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function PlanDimensions({ model, showShape = true }) {
  const { form } = model;
  return (
    <>
      {showShape && <ShapeField model={model} />}
      <InputField
        model={model}
        name="lengthMm"
        label="Length (mm)"
        type="number"
        min="0.001"
        max="100000"
        step="any"
        placeholder="e.g. 3000"
      />
      <MasterField
        model={model}
        name="outerMm"
        kind="rodSizes"
        label={['Hexa', 'Octa'].includes(form.rodType) ? 'Across flats (mm)' : 'Outer size (mm)'}
        suffix=" mm"
      />
      <ChoiceField
        model={model}
        name="dimension"
        label="Size measurement"
        options={
          ['Hexa', 'Octa'].includes(form.rodType) ? ['Across flats'] : ['Diameter', 'Radius']
        }
      />
      {form.rodType === 'Hollow' && (
        <InputField
          model={model}
          name="innerMm"
          label="Inner diameter (mm)"
          type="number"
          min="0.001"
          step="any"
          placeholder="e.g. 15"
          hint="Must be smaller than the outside diameter."
        />
      )}
    </>
  );
}

export { FormPanel };
