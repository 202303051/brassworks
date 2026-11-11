import { displayDate, factoryToday, heatNumber, recovery, sizeLabel, totalCharge } from './model';
import { names, number } from './ui';

export default function PrintRecords({ entity, rows, data }) {
  if (!data) return null;
  return (
    <section className="hidden print:block">
      <h1 className="font-heading text-3xl font-bold">Brassworks · {names[entity]}</h1>
      <p className="my-3 text-xs">
        Filtered report · {rows.length} records · Printed {displayDate(factoryToday())} IST · Demo
        data
      </p>
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="p-2">Date</th>
            <th className="p-2">Reference / company</th>
            <th className="p-2">Grade / size</th>
            <th className="p-2">Quantity / weight</th>
            <th className="p-2">Status / recovery</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="break-inside-avoid border-b border-border">
              <td className="p-2 align-top">{displayDate(row.date)}</td>
              <td className="p-2 align-top">
                {row.heatNo || row.orderName || row.company}
                <br />
                {entity === 'billets' ? heatNumber(row, data) : row.company}
              </td>
              <td className="p-2 align-top">
                {row.grade}
                <br />
                {row.size ||
                  (entity === 'plans' || entity === 'outputs' ? sizeLabel(row) : row.furnaceNo)}
              </td>
              <td className="p-2 align-top">
                {entity === 'heats'
                  ? number(totalCharge(row.materials)) + ' kg charge'
                  : entity === 'billets'
                    ? row.count + ' billets / ' + number(row.totalKg) + ' kg'
                    : entity === 'plans'
                      ? number(row.plannedKg) + ' kg planned'
                      : row.billetsUsed + ' billets / ' + number(row.actualKg) + ' kg rods'}
              </td>
              <td className="p-2 align-top">
                {row.status || number(recovery(row.actualKg, row.scrapKg), 2) + '%'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
