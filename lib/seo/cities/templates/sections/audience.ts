import { pickFor, type CityTemplateContext } from '../context';
import type { AudienceCard } from '../../types';

export function buildAudience(ctx: CityTemplateContext): { title: string; cards: AudienceCard[] } {
  const { name, county, corridor, parking, flags } = ctx;

  return {
    title: `Who Lavo helps in ${name}`,
    cards: [
      {
        title: 'For residents',
        bullets: [
          pickFor(ctx, 'ar0', [
            'Book a car wash from your phone.',
            `Search for your ${name} building and book from your phone.`,
            'Start with your building address to see if Lavo is live.',
          ]),
          pickFor(ctx, 'ar1', [
            'Use your building garage or approved parking area.',
            `Use your assigned stall or ${name} garage level when the property approves service.`,
            'Keep service in the lot or garage you already use.',
          ]),
          pickFor(ctx, 'ar2', [
            'Avoid driving to a separate car wash.',
            `Skip extra trips along ${corridor} just to reach a tunnel wash.`,
            'Reduce time lost to queues and weekend wash traffic.',
          ]),
          pickFor(ctx, 'ar3', [
            'Get updates when the service is complete.',
            'Receive notifications before and after your wash window.',
            'Know when the operator finishes so you can move the car if needed.',
          ]),
          'Request Lavo if your building is not active yet.',
        ],
      },
      {
        title: 'For property managers',
        bullets: [
          'Offer a resident amenity at no cost to the property.',
          pickFor(ctx, 'ap1', [
            'Avoid managing random outside detailers manually.',
            `Replace ad hoc vendors circling ${name} lots with one approved operator path.`,
            'Cut front desk calls about unauthorized detailers.',
          ]),
          pickFor(ctx, 'ap2', [
            'Set building rules, approved areas, quiet hours, and access instructions.',
            `Document garage and lot rules for ${parking} layouts common in ${county} County.`,
            'Share quiet hours and wash zones before the first service day.',
          ]),
          pickFor(ctx, 'ap3', [
            'Improve resident experience without adding staff.',
            'Add a practical perk for renewals without CapEx.',
            flags.isShoreCounty
              ? 'Useful for shore-season communities where residents expect convenience.'
              : 'Useful for commuter-heavy buildings where time savings matter.',
          ]),
          'Use the amenity in leasing, renewals, and resident communications.',
        ],
      },
      {
        title: 'For operators',
        bullets: [
          pickFor(ctx, 'ao0', [
            'Serve multiple residents in one building visit.',
            `Stack several ${name} units in one garage window when spots are labeled.`,
            'Complete more cars per stop when the building pre-clears access.',
          ]),
          pickFor(ctx, 'ao1', [
            `Build denser local routes along ${corridor}.`,
            `Pair ${name} with ${ctx.neighborText} on the same ${county} County day.`,
            'Reduce windshield time between retail one-off jobs.',
          ]),
          pickFor(ctx, 'ao2', [
            'Reduce time wasted driving between one off jobs.',
            'Anchor mid-week revenue with building wash days.',
            'Grow recurring demand in approved communities.',
          ]),
          'Work with properties that have clearer access rules.',
          'Follow property access, parking, and communication rules.',
        ],
      },
    ],
  };
}
