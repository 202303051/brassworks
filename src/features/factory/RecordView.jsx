import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useFactory } from './FactoryProvider';
import { formatFactoryDate, formatFactoryTime } from '@/lib/factory-time';
import {
  displayDate,
  heatNumber,
  inventory,
  meltingMinutes,
  planActual,
  recovery,
  sizeLabel,
  totalCharge,
} from './model';
import {
  Badge,
  FormPanel,
  names,
  number,
  PageState,
  parents,
  RecordHeading,
  recordTitle,
} from './ui';
import { DeleteRecord, EditRecord, PlanStatus } from './RecordActions';

function Facts({ items }) {
  return (
    <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="mt-1 break-words text-sm font-semibold">{value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

function FurnaceDetails({ row }) {
  const duration = meltingMinutes(row.startTime, row.readyTime);
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <FormPanel title="Heat & timing">
        <Facts
          items={[
            ['Date', displayDate(row.date)],
            ['Shift', row.shift],
            ['Furnace', row.furnaceNo],
            ['Heat number', row.heatNo],
            ['Start · IST', row.startTime],
            ['Full liquid ready · IST', row.readyTime],
            ['Melting time', Math.floor(duration / 60) + 'h ' + (duration % 60) + 'm'],
            ['Target grade', row.grade],
          ]}
        />
      </FormPanel>
      <FormPanel title="Raw material charge">
        <div className="divide-y divide-border">
          {row.materials.map((item, i) => (
            <div key={i} className="flex justify-between gap-3 py-3 text-sm">
              <span>{item.material}</span>
              <strong className="shrink-0 tabular-nums">{number(item.kg)} kg</strong>
            </div>
          ))}
        </div>
        <p className="mt-4 border-t border-border pt-4 text-sm">
          Total charge{' '}
          <strong className="float-right tabular-nums">
            {number(totalCharge(row.materials))} kg
          </strong>
        </p>
      </FormPanel>
      <div className="lg:col-span-2">
        <FormPanel title="Final spectro results">
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-5">
            {['cu', 'zn', 'pb', 'fe', 'sn'].map((element) => (
              <div key={element} className="rounded-md bg-muted p-4">
                <p className="text-xs uppercase text-muted-foreground">{element}</p>
                <p className="mt-1 font-heading text-3xl font-semibold">
                  {number(row[element], 4)}
                  <span className="ml-1 text-base">%</span>
                </p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <Badge tone={row.status === 'Pass' ? 'good' : 'warning'}>{row.status}</Badge>
            <p className="text-xs text-muted-foreground">
              Zinc: {row.autoZn ? 'automatic balance' : 'manual reading'}
            </p>
          </div>
        </FormPanel>
      </div>
    </div>
  );
}

function BilletDetails({ row, data }) {
  const group = inventory(data).find(
    (g) => g.company === row.company && g.grade === row.grade && g.size === row.size,
  );
  return (
    <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
      <FormPanel title="Billet receipt">
        <Facts
          items={[
            ['Entry date', displayDate(row.date)],
            [
              'Source heat',
              row.heatId ? (
                <Link className="underline" to={'/furnace/' + row.heatId}>
                  {heatNumber(row, data)}
                </Link>
              ) : (
                heatNumber(row, data)
              ),
            ],
            ['Company', row.company],
            ['Brass grade', row.grade],
            ['Billet size', row.size],
            ['Billets received', number(row.count, 0)],
            ['Total weight', number(row.totalKg) + ' kg'],
            ['Average billet weight', number(row.totalKg / row.count) + ' kg'],
          ]}
        />
      </FormPanel>
      <FormPanel title="Matching stock group">
        <p className="font-heading text-6xl font-semibold">{number(group?.available, 0)}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Available billets across all matching receipts.
        </p>
        <div className="mt-6">
          <Facts
            items={[
              ['All-time received', number(group?.received, 0)],
              ['Consumed', number(group?.used, 0)],
            ]}
          />
        </div>
      </FormPanel>
    </div>
  );
}

function PlanDetails({ row, data }) {
  const outputs = data.outputs.filter((o) => o.planId === row.id);
  const actual = planActual(data, row.id);
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <FormPanel title="Order & dimensions">
        <Facts
          items={[
            ['Date', displayDate(row.date)],
            ['Order', row.orderName],
            ['Company', row.company],
            ['Grade', row.grade],
            ['Rod type', row.rodType],
            ['Dimensions', sizeLabel(row)],
            ['Length', number(row.lengthMm) + ' mm'],
            ['Outer measurement', number(row.outerMm) + ' mm · ' + row.dimension],
            [
              'Inner diameter',
              row.rodType === 'Hollow' ? number(row.innerMm) + ' mm' : 'Not hollow',
            ],
            [
              'Priority',
              <Badge tone={row.priority === 'Urgent' ? 'warning' : 'neutral'}>
                {row.priority}
              </Badge>,
            ],
          ]}
        />
      </FormPanel>
      <FormPanel title="Plan progress">
        <Facts
          items={[
            ['Planned weight', number(row.plannedKg) + ' kg'],
            ['Actual finished rods', number(actual) + ' kg'],
            ['Remaining to target', number(Math.max(0, row.plannedKg - actual)) + ' kg'],
            ['Status', <PlanStatus row={row} />],
          ]}
        />
        <div className="mt-5 h-2 overflow-hidden rounded bg-muted">
          <div
            className="h-full bg-highlight"
            style={{ width: Math.min(100, (actual / row.plannedKg) * 100) + '%' }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {number((actual / row.plannedKg) * 100, 1)}% of target recorded
        </p>
      </FormPanel>
      <div className="lg:col-span-2">
        <FormPanel title="Linked production">
          {outputs.length ? (
            <div className="divide-y divide-border">
              {outputs.map((output) => (
                <Link
                  key={output.id}
                  to={'/output/' + output.id}
                  className="flex min-h-14 flex-wrap items-center justify-between gap-3 py-3 text-sm hover:underline"
                >
                  <span>
                    {displayDate(output.date)} · {output.billetsUsed} billets used
                  </span>
                  <strong>{number(output.actualKg)} kg →</strong>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No finished production is linked yet.</p>
          )}
        </FormPanel>
      </div>
    </div>
  );
}

function OutputDetails({ row, data }) {
  const plan = data.plans.find((p) => p.id === row.planId);
  const stock = inventory(data).find((g) => g.key === row.stockKey);
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <FormPanel title="Run & source">
        <Facts
          items={[
            ['Date', displayDate(row.date)],
            [
              'Planned order',
              plan ? (
                <Link className="underline" to={'/plans/' + plan.id}>
                  {plan.orderName}
                </Link>
              ) : (
                'Manual production'
              ),
            ],
            ['Company', row.company],
            ['Grade', row.grade],
            ['Rod type', row.rodType],
            ['Rod dimensions', sizeLabel(row)],
            ['Billet size consumed', stock?.size],
            ['Billets used', number(row.billetsUsed, 0)],
          ]}
        />
      </FormPanel>
      <FormPanel title="Output & recovery">
        <p className="font-heading text-6xl font-semibold">
          {number(recovery(row.actualKg, row.scrapKg), 2)}
          <span className="text-3xl">%</span>
        </p>
        <p className="mb-6 mt-2 text-sm text-muted-foreground">
          Net recovery from recorded rods and scrap.
        </p>
        <Facts
          items={[
            ['Actual rod produced', number(row.actualKg) + ' kg'],
            ['Scrap / butt', number(row.scrapKg) + ' kg'],
            ['Order planned weight', plan ? number(plan.plannedKg) + ' kg' : 'Manual run'],
            ['Order actual to date', plan ? number(planActual(data, plan.id)) + ' kg' : '—'],
          ]}
        />
        <p className="mt-5 text-xs leading-6 text-muted-foreground">
          Recovery = rod kg ÷ (rod kg + scrap / butt kg) × 100.
        </p>
      </FormPanel>
    </div>
  );
}

export default function RecordView({ entity }) {
  const { data } = useFactory();
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const row = data?.[entity].find((r) => r.id === id);
  const candidate = location.state?.returnTo;
  const back =
    typeof candidate === 'string' &&
    (candidate === parents[entity] || candidate.startsWith(parents[entity] + '?'))
      ? candidate
      : parents[entity];
  return (
    <PageState>
      {row ? (
        <div>
          <RecordHeading
            title={recordTitle(entity, row)}
            eyebrow={names[entity] + ' / record'}
            back={back}
          >
            <EditRecord entity={entity} row={row} />
            <DeleteRecord
              entity={entity}
              row={row}
              onDeleted={() => navigate(back, { replace: true })}
            />
          </RecordHeading>
          {entity === 'heats' && <FurnaceDetails row={row} />}
          {entity === 'billets' && <BilletDetails row={row} data={data} />}
          {entity === 'plans' && <PlanDetails row={row} data={data} />}
          {entity === 'outputs' && <OutputDetails row={row} data={data} />}
          <p className="mt-6 text-xs leading-6 text-muted-foreground">
            Created {formatFactoryDate(row.createdAt)} {formatFactoryTime(row.createdAt)} IST ·
            Updated {formatFactoryDate(row.updatedAt)} {formatFactoryTime(row.updatedAt)} IST
          </p>
        </div>
      ) : (
        <div>
          <RecordHeading title="Record not found" back={parents[entity]} />
          <p className="text-sm text-muted-foreground">
            The record may have been removed. Return to the log to continue.
          </p>
        </div>
      )}
    </PageState>
  );
}
