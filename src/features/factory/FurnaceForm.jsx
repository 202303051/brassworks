import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useFactory } from './FactoryProvider';
import SmartSelect from './SmartSelect';
import { factoryToday, meltingMinutes, totalCharge, zincBalance } from './model';
import { Field, fieldClass, number } from './ui';
import {
  ChoiceField,
  FormFooter,
  FormFrame,
  FormPanel,
  InputField,
  MasterField,
  useEntityForm,
} from './forms';

export default function FurnaceForm() {
  const { data } = useFactory();
  const [duplicateAccepted, setDuplicateAccepted] = useState(false);
  const model = useEntityForm(
    'heats',
    {
      date: factoryToday(),
      shift: 'Day',
      furnaceNo: 'F-1',
      heatNo: '',
      startTime: '07:00',
      readyTime: '10:00',
      materials: [{ material: 'Copper Scrap', kg: '' }],
      cu: '58',
      zn: '39',
      pb: '2.5',
      fe: '0.1',
      sn: '0.4',
      autoZn: true,
      grade: '',
      status: 'Pass',
    },
    (form) => ({ ...form, zn: form.autoZn ? zincBalance(form) : form.zn }),
  );
  const { form, set, errors } = model;
  useEffect(() => {
    setDuplicateAccepted(false);
  }, [form.heatNo]);
  const minutes = meltingMinutes(form.startTime, form.readyTime);
  const duplicate = data?.heats.some(
    (row) =>
      row.id !== model.id &&
      row.heatNo.trim().toLocaleLowerCase('en-IN') ===
        form.heatNo.trim().toLocaleLowerCase('en-IN'),
  );
  const zn = form.autoZn ? zincBalance(form) : Number(form.zn || 0);
  const spectroTotal =
    Number(form.cu || 0) + zn + Number(form.pb || 0) + Number(form.fe || 0) + Number(form.sn || 0);
  function material(index, field, value) {
    set(
      'materials',
      form.materials.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  }
  return (
    <FormFrame
      entity="heats"
      model={model}
      title={model.id ? 'Edit heat' : 'Record a furnace heat'}
    >
      <form
        noValidate
        onSubmit={(e) =>
          model.submit(e, () => {
            if (duplicate && !duplicateAccepted)
              throw new Error('Confirm the duplicate heat number before saving.');
          })
        }
        className="space-y-5"
      >
        <FormPanel step="01" title="Heat & liquid timing">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <InputField model={model} name="date" label="Heat date" type="date" />
            <ChoiceField model={model} name="shift" label="Shift" options={['Day', 'Night']} />
            <InputField
              model={model}
              name="furnaceNo"
              label="Furnace number"
              placeholder="e.g. F-1"
            />
            <InputField
              model={model}
              name="heatNo"
              label="Heat number"
              placeholder="e.g. HT-261111-013"
            />
            <InputField model={model} name="startTime" label="Heat start time · IST" type="time" />
            <InputField
              model={model}
              name="readyTime"
              label="Full liquid ready · IST"
              type="time"
              hint="An earlier clock time means the following day."
            />
          </div>
          <div className="mt-5 rounded-md bg-muted px-4 py-3 text-sm">
            <span className="text-muted-foreground">Melting time </span>
            <strong>
              {minutes == null ? '—' : Math.floor(minutes / 60) + 'h ' + (minutes % 60) + 'm'}
            </strong>
          </div>
          {duplicate && (
            <div className="mt-4 rounded-md border border-warning-border bg-warning-muted p-4">
              <p className="text-sm font-semibold text-warning">This heat number already exists.</p>
              <label className="mt-2 flex min-h-12 items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={duplicateAccepted}
                  onChange={(e) => setDuplicateAccepted(e.target.checked)}
                  className="size-5"
                />
                I confirm this is a separate heat using the same number.
              </label>
            </div>
          )}
        </FormPanel>
        <FormPanel
          step="02"
          title="Raw material charge"
          description="Add each material and its measured weight."
        >
          <div className="space-y-4">
            {form.materials.map((row, index) => (
              <div
                key={index}
                className="grid items-end gap-3 rounded-md border border-border p-4 sm:grid-cols-[1fr_160px_auto]"
              >
                <Field
                  label={'Material ' + (index + 1)}
                  id={'material-' + index}
                  error={errors['materials.' + index + '.material']}
                  required
                >
                  <SmartSelect
                    id={'material-' + index}
                    kind="materials"
                    value={row.material}
                    onChange={(value) => material(index, 'material', value)}
                  />
                </Field>
                <Field
                  label="Weight (kg)"
                  id={'weight-' + index}
                  error={errors['materials.' + index + '.kg']}
                  required
                >
                  <input
                    id={'weight-' + index}
                    className={fieldClass}
                    type="number"
                    min="0.001"
                    max="1000000"
                    step="any"
                    placeholder="e.g. 250.5"
                    value={row.kg}
                    onChange={(e) => material(index, 'kg', e.target.value)}
                  />
                </Field>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-12"
                  disabled={form.materials.length <= 1}
                  aria-label={'Remove material ' + (index + 1)}
                  onClick={() =>
                    set(
                      'materials',
                      form.materials.filter((_, i) => i !== index),
                    )
                  }
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
          {errors.materials && (
            <p role="alert" className="mt-2 text-xs text-destructive">
              {errors.materials}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              className="min-h-12"
              disabled={form.materials.length >= 50}
              onClick={() => set('materials', [...form.materials, { material: '', kg: '' }])}
            >
              + Add material
            </Button>
            <p className="text-sm">
              Total charge{' '}
              <strong className="ml-2 text-lg tabular-nums">
                {number(totalCharge(form.materials))} kg
              </strong>
            </p>
          </div>
        </FormPanel>
        <FormPanel step="03" title="Final spectro & grade">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {['cu', 'pb', 'fe', 'sn'].map((key) => (
              <InputField
                key={key}
                model={model}
                name={key}
                label={key.slice(0, 1).toUpperCase() + key.slice(1) + ' (%)'}
                type="number"
                min="0"
                max="100"
                step="any"
                placeholder="0.00"
              />
            ))}
            <Field label="Zn (%)" id="zn" error={errors.zn} required>
              <input
                id="zn"
                className={fieldClass}
                value={form.autoZn ? zn : form.zn}
                type="number"
                min="0"
                max="100"
                step="any"
                disabled={form.autoZn}
                onChange={(e) => set('zn', e.target.value)}
              />
            </Field>
            <MasterField model={model} name="grade" kind="grades" label="Target grade" />
            <ChoiceField
              model={model}
              name="status"
              label="Spectro status"
              options={['Pass', 'Correction Done']}
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <label className="flex min-h-12 items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="size-5"
                checked={form.autoZn}
                onChange={(e) => {
                  set('zn', zincBalance(form));
                  set('autoZn', e.target.checked);
                }}
              />
              Balance Zn automatically
            </label>
            <p
              className={
                'text-sm font-semibold ' +
                (spectroTotal > 100.000001 || zn < 0 ? 'text-destructive' : 'text-muted-foreground')
              }
            >
              Spectro total {number(spectroTotal, 4)}%
            </p>
          </div>
        </FormPanel>
        <FormFooter entity="heats" model={model} />
      </form>
    </FormFrame>
  );
}
