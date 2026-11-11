import { useFactory } from './FactoryProvider';
import { factoryToday, inventory, sizeLabel } from './model';
import { Field, fieldClass, number } from './ui';
import {
  FormFooter,
  FormFrame,
  FormPanel,
  InputField,
  MasterField,
  PlanDimensions,
  useEntityForm,
} from './forms';

export default function OutputForm() {
  const { data } = useFactory();
  const model = useEntityForm('outputs', {
    date: factoryToday(),
    planId: null,
    stockKey: '',
    company: '',
    grade: '',
    rodType: 'Round',
    lengthMm: '3000',
    outerMm: '',
    innerMm: 0,
    dimension: 'Diameter',
    billetsUsed: '',
    actualKg: '',
    scrapKg: '0',
  });
  const { form, set, setForm, record } = model;
  const plan = data?.plans.find((p) => p.id === form.planId);
  const groups = data
    ? inventory(data).filter(
        (g) =>
          (!form.company || g.company === form.company) && (!form.grade || g.grade === form.grade),
      )
    : [];
  const selected = groups.find((g) => g.key === form.stockKey);
  const available = selected
    ? selected.available + (record?.stockKey === selected.key ? record.billetsUsed : 0)
    : 0;
  function choosePlan(value) {
    const next = data.plans.find((p) => p.id === value);
    setForm((current) => ({
      ...current,
      planId: value || null,
      stockKey: '',
      ...(next
        ? {
            company: next.company,
            grade: next.grade,
            rodType: next.rodType,
            lengthMm: next.lengthMm,
            outerMm: next.outerMm,
            innerMm: next.innerMm,
            dimension: next.dimension,
          }
        : {}),
    }));
  }
  return (
    <FormFrame
      entity="outputs"
      model={model}
      title={model.id ? 'Edit finished production' : 'Record finished rods'}
    >
      <form noValidate onSubmit={model.submit} className="space-y-5">
        <FormPanel step="01" title="Plan or manual run">
          <div className="grid gap-5 sm:grid-cols-2">
            <InputField model={model} name="date" label="Production date" type="date" />
            <Field label="Planned order" id="planId">
              <select
                id="planId"
                className={fieldClass}
                value={form.planId || ''}
                onChange={(e) => choosePlan(e.target.value)}
              >
                <option value="">Manual production</option>
                {data?.plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.orderName} · {p.company} · {p.status}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {plan && (
            <div className="mt-5 rounded-md bg-highlight/10 p-4 text-sm">
              <strong>
                {plan.orderName} · {number(plan.plannedKg)} kg planned
              </strong>
              <p className="mt-1 text-muted-foreground">
                {plan.company} · {plan.grade} · {plan.rodType} · {sizeLabel(plan)}
              </p>
            </div>
          )}
          {!plan && (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <MasterField model={model} name="company" kind="companies" label="Company" />
              <MasterField model={model} name="grade" kind="grades" label="Brass grade" />
              <PlanDimensions model={model} />
            </div>
          )}
        </FormPanel>
        <FormPanel
          step="02"
          title="Billet consumption"
          description="Choose the matching company, grade and billet size. Stock is checked again when the record is saved."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Billet stock group" id="stockKey" error={model.errors.stockKey} required>
              <select
                id="stockKey"
                className={fieldClass}
                value={form.stockKey}
                onChange={(e) => set('stockKey', e.target.value)}
              >
                <option value="">Choose available stock</option>
                {groups.map((g) => (
                  <option key={g.key} value={g.key}>
                    {g.company} · {g.grade} · {g.size} ·{' '}
                    {g.available + (record?.stockKey === g.key ? record.billetsUsed : 0)} available
                  </option>
                ))}
              </select>
            </Field>
            <InputField
              model={model}
              name="billetsUsed"
              label="Billets used"
              type="number"
              min="1"
              max={available || undefined}
              step="1"
              placeholder="e.g. 8"
              hint={
                selected
                  ? number(available, 0) + ' billets available before this entry.'
                  : 'Choose a stock group first.'
              }
            />
          </div>
          {form.company && form.grade && !groups.length && (
            <p className="mt-4 text-sm text-warning">
              No matching billet stock. Add a billet entry for this company and grade first.
            </p>
          )}
        </FormPanel>
        <FormPanel step="03" title="Finished output & recovery">
          <div className="grid gap-5 sm:grid-cols-2">
            <InputField
              model={model}
              name="actualKg"
              label="Actual rod produced (kg)"
              type="number"
              min="0.001"
              max="1000000"
              step="any"
              placeholder="e.g. 290"
            />
            <InputField
              model={model}
              name="scrapKg"
              label="Scrap / butt weight (kg)"
              type="number"
              min="0"
              max="1000000"
              step="any"
              placeholder="e.g. 18"
            />
          </div>
          <p className="mt-4 text-xs leading-6 text-muted-foreground">
            Recovery = rod kg ÷ (rod kg + scrap / butt kg) × 100. Plan statuses are controlled in
            Rod planning.
          </p>
        </FormPanel>
        <FormFooter entity="outputs" model={model} />
      </form>
    </FormFrame>
  );
}
