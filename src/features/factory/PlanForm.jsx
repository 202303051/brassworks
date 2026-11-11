import { factoryToday } from './model';
import {
  ChoiceField,
  FormFooter,
  FormFrame,
  FormPanel,
  InputField,
  MasterField,
  PlanDimensions,
  ShapeField,
  useEntityForm,
} from './forms';

export default function PlanForm() {
  const model = useEntityForm('plans', {
    date: factoryToday(),
    rodType: 'Round',
    lengthMm: '3000',
    outerMm: '',
    innerMm: 0,
    dimension: 'Diameter',
    grade: '',
    plannedKg: '',
    company: '',
    orderName: '',
    priority: 'Normal',
    status: 'Planned',
  });
  return (
    <FormFrame entity="plans" model={model} title={model.id ? 'Edit rod plan' : 'Plan a rod run'}>
      <form noValidate onSubmit={model.submit} className="space-y-5">
        <FormPanel step="01" title="Shape & grade">
          <div className="grid gap-5 sm:grid-cols-2">
            <InputField model={model} name="date" label="Planning date" type="date" />
            <MasterField model={model} name="grade" kind="grades" label="Brass grade" />
            <ShapeField model={model} />
          </div>
        </FormPanel>
        <FormPanel
          step="02"
          title="Rod dimensions"
          description="Length and outer measurement are in millimetres. Hollow rods also require an inner diameter."
        >
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <PlanDimensions model={model} showShape={false} />
          </div>
        </FormPanel>
        <FormPanel step="03" title="Target & party">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <InputField
              model={model}
              name="plannedKg"
              label="Planned weight (kg)"
              type="number"
              min="0.001"
              max="1000000"
              step="any"
              placeholder="e.g. 500"
            />
            <MasterField model={model} name="company" kind="companies" label="Company" />
            <InputField
              model={model}
              name="orderName"
              label="Order name / number"
              placeholder="e.g. ORD-2053"
            />
            <ChoiceField
              model={model}
              name="priority"
              label="Priority"
              options={['Normal', 'Urgent']}
            />
            <ChoiceField
              model={model}
              name="status"
              label="Plan status"
              options={['Planned', 'In Production', 'Completed']}
            />
          </div>
        </FormPanel>
        <FormFooter entity="plans" model={model} />
      </form>
    </FormFrame>
  );
}
