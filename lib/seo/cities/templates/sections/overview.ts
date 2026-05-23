import { pickFor, type CityTemplateContext } from '../context';

const OV0_POOL = (ctx: CityTemplateContext, hood: string) => [
  `${ctx.name} has many apartment communities ${hood} in ${ctx.county} County. Depending on the property, residents often park in ${ctx.parkingTypes}, which can make a building based mobile car wash program easier to coordinate than a traditional drive to a car wash.`,
  `In ${ctx.name}, ${ctx.commonPropertyTypes} often rely on ${ctx.parkingTypes}. When the property approves a service zone, residents can book washes without leaving the community.`,
  `${ctx.name} sits in ${ctx.region}, where buildings along ${ctx.corridor} see steady use from ${ctx.commute}. On-site washing can fit buildings that already manage garage or lot access carefully.`,
  `${ctx.name} is a ${ctx.muni.type} in ${ctx.county} County with stock that commonly includes ${ctx.parkingTypes}. That layout can support on-site service when rules are posted clearly.`,
  `Many ${ctx.name} households park in ${ctx.parkingTypes}, which is why building-approved wash zones matter more than finding a nearby tunnel wash.`,
  `Along ${ctx.corridor}, ${ctx.name} residents often balance ${ctx.commute} with limited time for errands — building-based booking can remove one trip.`,
  `In ${ctx.county} County, ${ctx.name} properties with assigned stalls or garages can coordinate operator access once management defines wash windows.`,
  `${ctx.name} communities range from garden lots to structured parking; Lavo fits when the property approves where service can happen.`,
];

const OV1_POOL = (ctx: CityTemplateContext) => [
  `For residents balancing work, commuting, and errands, Lavo gives ${ctx.name} households a way to book a wash at the building instead of leaving the property.`,
  `Many ${ctx.name} residents already treat car care as a time problem. Building based service can reduce extra trips when parking is assigned or garage-based.`,
  `Properties in ${ctx.name} can offer convenience while keeping vendor access organized through clear rules and approved service windows.`,
  `When ${ctx.name} buildings document stall labels and garage rules, operators can serve residents without blocking drive aisles.`,
  `Residents in ${ctx.name} can request Lavo at buildings that are not live yet, which helps property managers see demand before launch.`,
  `For ${ctx.name} leasing teams, the amenity is easy to explain: residents book and pay; the building offers convenience at no cost.`,
  `In ${ctx.name}, the first step is property approval for where washing can happen — usually a garage level, lot section, or assigned stall area.`,
  `${ctx.name} operators and managers both benefit when wash rules are written down instead of handled as one-off vendor visits.`,
];

export function buildOverview(ctx: CityTemplateContext): string[] {
  const { name, enrichment, tier, neighborhoods } = ctx;
  const paras: string[] = [];

  if (enrichment.overviewExtra?.length) {
    paras.push(...enrichment.overviewExtra);
  } else {
    const hood =
      neighborhoods?.length && tier === 1
        ? `especially near ${neighborhoods.slice(0, 4).join(', ')}`
        : 'across the municipality';
    paras.push(
      pickFor(ctx, 'ov0', OV0_POOL(ctx, hood)),
      pickFor(ctx, 'ov1', OV1_POOL(ctx)),
    );
    if (tier >= 2) {
      paras.push(
        pickFor(ctx, 'ov2', [
          `In ${name}, mobile service works best when properties post clear garage or lot rules and operators can stage equipment without blocking drive aisles.`,
          `Many ${name} communities mix garden stock with mid-rise buildings, so spot labeling in the booking flow helps operators on first visits.`,
          `Winter road salt and seasonal grime in ${ctx.county} County push some ${name} residents toward on-site service instead of weekend tunnel trips.`,
          `Along ${ctx.corridor}, ${name} buildings can start with one approved operator rather than many uncoordinated vendors.`,
          `Assigned parking in ${name} makes on-site washes practical when management defines the service zone up front.`,
          `Garden-style lots in ${name} can speed operator turnover when stall numbers are visible from the drive lane.`,
          `Mid-rise stock in ${name} still needs garage or lot rules before operators schedule the first visit.`,
          `Properties in ${name} near ${ctx.corridor} often see commuter vehicles that benefit from regular exterior care without extra driving.`,
        ]),
      );
    }
    if (tier >= 3) {
      paras.push(
        pickFor(ctx, 'ov3b', [
          `In ${name}, ${ctx.parking} is typical of ${ctx.region}, which shapes how operators plan building visits.`,
          `${name} sits along ${ctx.corridor}, where ${ctx.commute} can make time-saving building services attractive.`,
          `Properties in ${name} near ${ctx.corridor} often see commuter vehicles that benefit from regular exterior care without extra driving.`,
          `${name} households along ${ctx.corridor} may prefer building-based booking when parking is already assigned at home.`,
        ]),
      );
    }
  }

  paras.push(
    pickFor(ctx, 'ovpm', [
      `For property managers in ${name}, the value is not just the wash itself. The value is giving residents a practical amenity that feels useful, does not require new building infrastructure, and can be managed through clear access rules, service windows, and operator instructions.`,
      `Property teams in ${name} can offer a practical amenity without wash bays or new staff while residents book and pay for their own service.`,
      `In ${name}, Lavo helps management offer structured vendor access instead of one-off detailers who arrive without clear building rules.`,
      `For ${name} boards and managers, the program stays lightweight: residents book in the app; the building sets access and quiet-hour rules.`,
      `Management in ${name} can use Lavo in renewals and tours as a convenience perk tied to parking residents already pay for.`,
      `The goal in ${name} is not to operate a car wash — it is to let residents use their building parking for approved mobile service.`,
    ]),
  );

  if (tier === 1) {
    paras.push(
      pickFor(ctx, 'ov3', [
        `${name} properties with structured parking often benefit when management defines approved wash zones, quiet hours, and garage access instructions before the first service day.`,
        `Residents in commuter-heavy ${name} buildings may rebook when the first on-site visit is smooth and matches building parking rules.`,
        `Tier-one demand in ${name} often starts with residents requesting their building so managers can see interest.`,
      ]),
      pickFor(ctx, 'ov4', [
        flagsAwareTransit(ctx),
        `In ${name}, commuter patterns and ${ctx.commute} can make building based washes more attractive than extra driving.`,
        `${name} households with assigned parking often prefer on-site service when management defines clear wash windows.`,
      ]),
    );
  }

  return paras.slice(0, tier === 1 ? 5 : tier === 2 ? 4 : 4);
}

function flagsAwareTransit(ctx: CityTemplateContext): string {
  if (ctx.flags.isHudsonWaterfront) {
    return `Depending on the property, buildings near PATH, ferries, and ${ctx.corridor} may see stronger demand from residents who want car care without another commute-day errand.`;
  }
  if (ctx.flags.isShoreCounty) {
    return `Depending on the property, shore-season buildings in ${ctx.name} may see more demand when residents want care without fighting summer beach traffic.`;
  }
  return `Depending on the property, buildings near ${ctx.nearbyTransit} may see stronger demand from residents who want car care without adding another stop to their commute.`;
}
