import { pick, type CityTemplateContext } from '../context';

export function buildVehicleCare(ctx: CityTemplateContext) {
  const { name, county, flags } = ctx;

  const para2Options = flags.isShoreCounty
    ? [
        `In ${name}, coastal salt air and shore-season traffic along ${ctx.corridor} can add film between washes, especially when vehicles sit in garages near the coast.`,
        `Shore-area buildings in ${county} County may see faster exterior buildup from salt air and summer tourism traffic near approved parking areas.`,
        `For ${name} residents near the Shore, regular exterior care can be practical when service happens in an approved lot or garage instead of driving to a tunnel wash.`,
      ]
    : flags.isHudsonWaterfront || flags.isGoldCoastBergen
      ? [
          `In ${name}, commuter traffic along ${ctx.corridor} and ${ctx.commute} can add road film between washes.`,
          `Waterfront and bridge-and-tunnel commuters in ${name} often prefer on-site service when garage access is already solved at home.`,
          `Urban garage dust and tunnel grime are common reasons ${name} residents book washes at the building when management approves a service zone.`,
        ]
      : flags.isPhiladelphiaCommuter
        ? [
            `Cross-river commuters in ${name} often see road film from ${ctx.corridor} and daily driving to Philadelphia-area jobs.`,
            `In ${county} County, winter salt and commuter dust can build up when vehicles park in assigned stalls or small garages.`,
            `Depending on the property, ${name} residents may prefer on-site washes instead of adding another stop after work.`,
          ]
        : flags.isPharmaCorporate
          ? [
              `Corporate-campus commuters in ${name} often drive ${ctx.corridor} daily, which can add road film between washes.`,
              `In ${county} County, pollen and lot dust can build when cars sit in garden or campus-adjacent parking areas.`,
              `Residents in ${name} with assigned parking may book building-based service to avoid weekend strip-mall queues.`,
            ]
          : [
              `In ${name}, commuter traffic along ${ctx.corridor} and ${ctx.commute} can add road film between washes.`,
              `Depending on the property, garage dust, pollen, and seasonal salt exposure are common reasons residents prefer on-site service.`,
              `In ${county} County, assigned parking and garage storage mean residents may not notice buildup until a long commute — on-site washing can fit into a normal week.`,
            ];

  return {
    title: `Car care considerations in ${name}`,
    paragraphs: [
      `In many New Jersey communities, ${ctx.localVehicleCareFactors} can affect how quickly vehicles pick up grime, especially when cars sit in apartment garages or shared lots.`,
      pick(ctx.seed + 'vc1', para2Options),
      `Lavo does not guarantee specific environmental outcomes. The practical goal is helping residents maintain vehicles without turning car care into a separate errand.`,
    ],
  };
}
