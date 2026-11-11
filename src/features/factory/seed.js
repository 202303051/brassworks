import { factoryToday, shiftDate, stockKey, zincBalance } from './model.js';

export function seedState(instant = new Date().toISOString()) {
  const today = factoryToday(instant);
  const companies = [
    'Jamnagar Precision Components',
    'Rajkot Auto Parts',
    'Shakti Engineering',
    'Naval Metal Works',
  ];
  const grades = ['Free Cutting IS 319 / CZ121', 'Forging Brass', 'Naval Brass'];
  const billetSizes = ['100mm × 600mm', '125mm × 750mm', '90mm × 500mm'];
  const state = {
    version: 1,
    revision: 0,
    seedDate: today,
    masters: {
      companies,
      grades,
      billetSizes,
      rodSizes: ['20', '25', '32', '40', '50', '60'],
      materials: ['Copper Scrap', 'Zinc', 'Brass Honey', 'Turning / Boring', 'Lead'],
    },
    heats: [],
    billets: [],
    plans: [],
    outputs: [],
  };
  for (let i = 0; i < 12; i += 1) {
    const date = shiftDate(today, i < 5 ? 0 : i < 9 ? -1 : -3);
    const id = 'heat-' + (i + 1);
    const chemistry = {
      cu: i % 3 === 2 ? 60 : 58,
      pb: i % 3 === 0 ? 2.5 : 1.2,
      fe: 0.1,
      sn: i % 3 === 2 ? 1 : 0.2,
    };
    state.heats.push({
      id,
      date,
      shift: i % 2 ? 'Night' : 'Day',
      furnaceNo: 'F-' + ((i % 3) + 1),
      heatNo: 'HT-' + today.replaceAll('-', '').slice(2) + '-' + String(i + 1).padStart(3, '0'),
      startTime: i % 2 ? '23:10' : '07:30',
      readyTime: i % 2 ? '01:35' : '10:15',
      materials: [
        { material: 'Copper Scrap', kg: 350 + i * 8 },
        { material: 'Zinc', kg: 210 + i * 3 },
        { material: 'Brass Honey', kg: 115 },
      ],
      ...chemistry,
      zn: zincBalance(chemistry),
      autoZn: true,
      grade: grades[i % 3],
      status: i % 4 ? 'Pass' : 'Correction Done',
      createdAt: date + 'T03:00:00Z',
      updatedAt: instant,
    });
    state.billets.push({
      id: 'billet-' + (i + 1),
      date,
      heatId: id,
      customHeatNo: '',
      company: companies[i % 4],
      grade: grades[i % 3],
      size: billetSizes[i % 3],
      count: 24 + i * 3,
      totalKg: (24 + i * 3) * 38.5,
      createdAt: date + 'T04:00:00Z',
      updatedAt: instant,
    });
    state.plans.push({
      id: 'plan-' + (i + 1),
      date,
      rodType: ['Round', 'Hexa', 'Octa', 'Hollow'][i % 4],
      grade: grades[i % 3],
      lengthMm: 3000 + (i % 2) * 1000,
      outerMm: [25, 32, 40, 50][i % 4],
      innerMm: i % 4 === 3 ? 18 : 0,
      dimension: [1, 2].includes(i % 4) ? 'Across flats' : 'Diameter',
      plannedKg: 280 + i * 45,
      company: companies[i % 4],
      orderName: 'ORD-' + String(2041 + i),
      priority: i % 4 === 0 ? 'Urgent' : 'Normal',
      status: ['Planned', 'In Production', 'Completed'][i % 3],
      createdAt: date + 'T04:30:00Z',
      updatedAt: instant,
    });
  }
  for (let i = 0; i < 9; i += 1) {
    const plan = state.plans[i];
    const billet = state.billets[i];
    state.outputs.push({
      id: 'output-' + (i + 1),
      date: plan.date,
      planId: plan.id,
      stockKey: stockKey(billet.company, billet.grade, billet.size),
      company: plan.company,
      grade: plan.grade,
      rodType: plan.rodType,
      lengthMm: plan.lengthMm,
      outerMm: plan.outerMm,
      innerMm: plan.innerMm,
      dimension: plan.dimension,
      billetsUsed: 8 + i,
      actualKg: 260 + i * 31,
      scrapKg: 18 + i * 2,
      createdAt: plan.date + 'T08:00:00Z',
      updatedAt: instant,
    });
  }
  return state;
}
