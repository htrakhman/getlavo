import { pick, type CityTemplateContext } from '../context';

export function buildOperators(ctx: CityTemplateContext) {
  const { name, county, corridor, neighborText, parking, muni } = ctx;

  return {
    title: `Operator opportunities in ${name}`,
    paragraphs: [
      `Lavo can help operators find apartment based demand in ${name} and ${county} County. Apartment buildings can create multiple bookings in one location, which may reduce dead time between jobs and support recurring routes along ${corridor}.`,
      pick(ctx.seed + 'op1', [
        `Operators serving ${name} can pair stops with ${neighborText} when buildings share similar parking rules.`,
        `Crews familiar with ${parking} in ${county} County often work faster when properties share spot maps up front.`,
        `A wash day in ${name} can anchor a route that includes ${neighborText} before retail appointments.`,
        `Operators building ${county} County routes can stack ${name} with nearby municipalities on the same corridor.`,
      ]),
      pick(ctx.seed + 'op2', [
        `In ${name}, ${muni.type} properties with ${ctx.parkingTypes} can support higher daily throughput when stall labels match garage signage.`,
        `Management-approved buildings in ${name} reduce time lost to access confusion or refused garage entry.`,
        `Exterior packages for ${name} can be tuned for salt, pollen, and road film common in the region.`,
      ]),
      `Availability depends on approved properties and resident demand in ${name}. Operators must follow property rules and quality expectations.`,
    ],
    bullets: [
      pick(ctx.seed + 'ob0', [
        'Find apartment based demand',
        `Find ${name} building demand along ${corridor}`,
        `Serve ${county} County apartment communities`,
      ]),
      pick(ctx.seed + 'ob1', [
        'Serve multiple residents per building visit',
        `Stack units in one ${name} garage window`,
        'Increase cars per hour with pre-cleared access',
      ]),
      pick(ctx.seed + 'ob2', [
        'Build recurring local routes',
        `Link ${name} with ${neighborText}`,
        'Grow weekly building anchors',
      ]),
      'Follow property access and quality rules',
      'Grow with approved communities',
    ],
  };
}
