import { useFactory } from './FactoryProvider';
import { factoryToday } from './model';
import { Field, fieldClass } from './ui';
import { FormFooter, FormFrame, FormPanel, InputField, MasterField, useEntityForm } from './forms';

export default function BilletForm() {
  const { data } = useFactory();
  const model = useEntityForm('billets', {
    date: factoryToday(),
    heatId: null,
    customHeatNo: '',
    company: '',
    grade: '',
    size: '',
    count: '',
    totalKg: '',
  });
  return (
    <FormFrame
      entity="billets"
      model={model}
      title={model.id ? 'Edit billet entry' : 'Receive billets'}
    >
      <form noValidate onSubmit={model.submit} className="space-y-5">
        <FormPanel step="01" title="Source heat">
          <div className="grid gap-5 sm:grid-cols-2">
            <InputField model={model} name="date" label="Entry date" type="date" />
            <Field
              label="Linked heat"
              id="heatId"
              hint="Choose a furnace heat, or enter a custom number below."
            >
              <select
                id="heatId"
                className={fieldClass}
                value={model.form.heatId || ''}
                onChange={(e) => model.set('heatId', e.target.value || null)}
              >
                <option value="">Custom / external heat</option>
                {data?.heats.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.heatNo} · {h.grade}
                  </option>
                ))}
              </select>
            </Field>
            {!model.form.heatId && (
              <InputField
                model={model}
                name="customHeatNo"
                label="Custom heat number"
                placeholder="e.g. EXT-108"
              />
            )}
          </div>
        </FormPanel>
        <FormPanel step="02" title="Billet identity">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <MasterField model={model} name="company" kind="companies" label="Company" />
            <MasterField model={model} name="grade" kind="grades" label="Brass grade" />
            <MasterField model={model} name="size" kind="billetSizes" label="Billet size" />
          </div>
        </FormPanel>
        <FormPanel
          step="03"
          title="Quantity received"
          description="Available stock is received billets minus every matching production consumption."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <InputField
              model={model}
              name="count"
              label="Number of billets"
              type="number"
              min="1"
              max="1000000"
              step="1"
              placeholder="e.g. 24"
            />
            <InputField
              model={model}
              name="totalKg"
              label="Total weight (kg)"
              type="number"
              min="0.001"
              max="1000000"
              step="any"
              placeholder="e.g. 924"
            />
          </div>
        </FormPanel>
        <FormFooter entity="billets" model={model} />
      </form>
    </FormFrame>
  );
}
