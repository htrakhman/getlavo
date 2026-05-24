import { pick, type CityTemplateContext } from '../context';

export function buildResidentBenefits(ctx: CityTemplateContext) {
  const { name, county } = ctx;
  return {
    title: `Benefits for ${name} residents`,
    paragraphs: [
      pick(ctx.seed + 'rb0', [
        `For residents in ${name}, Lavo is built around the reality that car care is usually an errand. You either drive somewhere, wait around, or squeeze it between work, commuting, groceries, and weekends. A building based mobile wash turns that errand into something residents can schedule from home.`,
        `In ${name}, many residents already lose time to commuting and errands. Booking at the building can keep the car in your assigned stall or garage.`,
        `${name} residents with structured parking can schedule washes without re-parking on busy streets.`,
      ]),
      pick(ctx.seed + 'rb1', [
        `In areas with ${ctx.localVehicleCareFactors}, regular exterior care can help without adding another trip across ${county} County.`,
        `Residents who park in assigned stalls or garages in ${name} can keep the vehicle in place while service happens in an approved zone.`,
        `Along ${ctx.corridor}, exterior upkeep can be easier to maintain when washing happens at the building.`,
      ]),
    ],
    bullets: [
      pick(ctx.seed + 'rbb0', ['No drive to a car wash', `Skip tunnel trips from ${name}`, 'Avoid extra driving for basic washes']),
      pick(ctx.seed + 'rbb1', ['Book from your apartment', 'Book from your phone at home', 'Schedule around work-from-home days']),
      pick(ctx.seed + 'rbb2', ['Save time before work, weekends, or errands', 'Fit washes into commuter schedules', 'Avoid weekend wash lines']),
      'Avoid waiting rooms and lines',
      'Works well for assigned parking and garage spaces',
      'Can rebook when needed',
      'Useful for busy household schedules',
    ],
  };
}

export function buildPropertyManagerBenefits(ctx: CityTemplateContext) {
  const { name, county } = ctx;
  return {
    title: `Benefits for ${name} property managers`,
    paragraphs: [
      pick(ctx.seed + 'pb0', [
        `Property managers in ${name} are not buying a car wash. They are adding a convenience layer to the resident experience. Lavo is designed to be lightweight for property teams: no equipment purchase, no staffing requirement, and no construction.`,
        `For ${name} teams, Lavo is an amenity layer — not a new operating department.`,
        `Managers in ${county} County can offer convenience while residents handle booking and payment.`,
      ]),
      pick(ctx.seed + 'pb1', [
        `The amenity can be mentioned in resident emails, tours, welcome packets, and renewal campaigns while reducing uncoordinated outside vendors on the property.`,
        `Use ${name} building data to decide whether to expand wash-day frequency over time.`,
        'Document vendor access once for auditors, boards, and insurers.',
      ]),
    ],
    bullets: [
      'No cost to offer',
      'No equipment purchase',
      'No staffing requirement',
      'No construction',
      pick(ctx.seed + 'pbb4', [
        'Can improve amenity package',
        `Differentiate ${name} against nearby communities`,
        'Add a perk residents understand quickly',
      ]),
      'Can reduce uncoordinated outside vendors',
      'Gives residents a clear way to request the amenity',
      'Works when parking is manageable',
    ],
  };
}
