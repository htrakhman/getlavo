import { pick, type CityTemplateContext } from '../context';

export function buildWhyBuildings(ctx: CityTemplateContext) {
  const { name, county, neighborText } = ctx;

  return {
    title: `Why apartment buildings in ${name} add Lavo`,
    paragraphs: [
      `For many apartment buildings in ${name}, the challenge is not whether residents want convenience. The challenge is offering useful services without creating extra work for the onsite team. Lavo is designed around that constraint. The property can offer a practical resident amenity while residents book and pay for their own service.`,
      pick(ctx.seed + 'wb1', [
        `In ${county} County, buildings with garages or assigned parking often see more value when wash service happens in an approved zone instead of through ad hoc vendors.`,
        `Properties in ${name} can support resident satisfaction without adding staff, equipment rooms, or wash bay construction.`,
        `Managers in ${name} can route operator interest through Lavo instead of fielding random detailer requests at the desk.`,
        `When several buildings near ${neighborText} share similar parking rules, operators can offer predictable wash windows.`,
        `Leasing teams in ${name} can describe a concrete perk: residents book mobile washes where they already park.`,
        `${name} portfolios can align vendor insurance and access rules once instead of per resident request.`,
      ]),
    ],
    bullets: [
      'Offer a practical amenity residents actually use',
      'Reduce confusion around outside vendors',
      'Create clear rules for when and where service happens',
      'Support resident satisfaction without adding staff',
      'Make garages and parking areas feel more valuable',
      'Differentiate against nearby apartment communities',
    ],
  };
}
