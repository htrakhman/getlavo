import { pick, type CityTemplateContext } from '../context';

export function buildParking(ctx: CityTemplateContext) {
  const { name, parking } = ctx;

  return {
    title: `Parking and access requirements for ${name} buildings`,
    paragraphs: [
      `In ${name}, Lavo works best when the building can define an approved service area using the property's actual parking setup: ${parking}. Management should also document garage or lot access, resident stall details, operator entrance instructions, quiet hours, water and runoff rules, staging areas, and who operators should contact if access fails.`,
      pick(ctx.seed + 'pk1', [
        'Depending on the property, some buildings prefer interior garage service while others prefer exterior lots. Insurance and vendor requirements should be confirmed with management before launch.',
        `Properties in ${name} should confirm whether interior garage bays, exterior lots, or assigned stalls are approved before the first wash day.`,
        'Share freight elevator rules, concierge steps, and runoff restrictions up front so operators can plan equipment and timing.',
      ]),
    ],
    checklist: [
      'Where can operators enter?',
      'Where can operators park or stage?',
      'Which areas are approved for washing?',
      'Are there garage height restrictions?',
      'Are there quiet hours?',
      'Are there water use or drainage restrictions?',
      'Should residents move cars to a specific area?',
      'Who should operators call if access fails?',
      'Are there building specific vendor requirements?',
    ],
  };
}
