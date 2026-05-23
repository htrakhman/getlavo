import { pickFor, type CityTemplateContext } from '../context';

export function buildHero(ctx: CityTemplateContext) {
  const { name, county } = ctx;

  const plainEnglish = [
    pickFor(ctx, 'he0', [
      `For residents, Lavo means less time driving to a car wash in ${name}.`,
      `Residents in ${name} can book a wash at their building instead of leaving for a tunnel or strip-mall wash.`,
      `In ${name}, Lavo turns car care into a building-based booking instead of another weekend errand.`,
      `${name} residents can request service at their building instead of hunting for a nearby tunnel wash.`,
    ]),
    pickFor(ctx, 'he1', [
      `For property managers in ${name}, it is a no cost amenity that adds convenience without new staff or equipment.`,
      `Property teams in ${name} can add a resident perk without building a wash bay or hiring onsite staff.`,
      `For ${county} County buildings in ${name}, Lavo is a no cost layer on top of existing parking and vendor rules.`,
      `Managers in ${name} can offer structured vendor access without operating a wash bay.`,
    ]),
    pickFor(ctx, 'he2', [
      `For operators, ${name} creates organized building based routes instead of scattered one off jobs.`,
      `Operators serving ${name} can stack multiple units at one garage or lot when access rules are clear.`,
      `In ${name}, operators can build route density by serving several residents at the same approved property.`,
      `Route planning in ${name} improves when several units share one approved garage or lot window.`,
    ]),
  ];

  const trustLine = pickFor(ctx, 'hetr', [
    `Built for apartment garages, parking lots, and managed properties in ${name} and across New Jersey.`,
    `Serving apartment communities in ${county} County with building-approved mobile wash and detail booking.`,
    `Designed for ${name} buildings where residents park in garages, lots, or assigned community spaces.`,
  ]);

  return {
    subheadline: `Lavo helps residents in ${name} book mobile car washes and detailing directly from their apartment garage, parking lot, or managed residential community.`,
    plainEnglish,
    aeoSummary: `Lavo is a mobile car wash and detailing platform for apartment buildings in ${name}, New Jersey. Residents can request or book service at their building, property managers can offer Lavo as a no cost amenity, and operators can serve scheduled apartment routes. Availability depends on building approval and local operator coverage.`,
    trustLine,
  };
}
