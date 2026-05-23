import { pickFor, type CityTemplateContext } from '../context';
import type { NumberedStep } from '../../types';

function residentSteps(ctx: CityTemplateContext): NumberedStep[] {
  const { name } = ctx;
  return [
    {
      title: 'Search for your building',
      description: pickFor(ctx, 'hr0', [
        'Enter your apartment building or community address to see whether Lavo is available.',
        `Search your ${name} address to see whether your building is already on Lavo.`,
        'Start with your building name or street address in the search box.',
      ]),
    },
    {
      title: 'Request Lavo if your building is not live yet',
      description: pickFor(ctx, 'hr1', [
        'If your property is not active, submit a request so Lavo can see resident demand and contact the building.',
        `If your ${name} building is not listed, submit a request so Lavo can alert your property manager.`,
        'Share your building address to flag demand while management reviews the amenity.',
      ]),
    },
    {
      title: 'Book a service',
      description: pickFor(ctx, 'hr2', [
        'Choose an available wash or detail package, select a time window, and enter any needed parking details.',
        'Pick a package, time window, and parking stall details required by your building.',
        'Select service options and confirm before the operator arrives.',
      ]),
    },
    {
      title: 'Share vehicle and parking details',
      description: pickFor(ctx, 'hr3', [
        'Add your unit number, parking level, stall number, license plate, or building specific instructions when required.',
        `Include garage level, stall label, and plate details common in ${name} buildings.`,
        'Match spot labels to garage signage so operators find the right vehicle.',
      ]),
    },
    {
      title: 'Get service updates',
      description: pickFor(ctx, 'hr4', [
        'Receive updates before and after the operator completes the wash.',
        'Get notified when service starts and when it is complete.',
        'Use updates to plan around garage access or move the car if needed.',
      ]),
    },
    {
      title: 'Rebook when needed',
      description: pickFor(ctx, 'hr5', [
        'Residents can rebook future services based on building availability and operator coverage.',
        `Rebook in ${name} when your building runs recurring wash windows.`,
        'Schedule follow-up visits when your property and operator allow.',
      ]),
    },
  ];
}

function pmSteps(ctx: CityTemplateContext): NumberedStep[] {
  const { name, county } = ctx;
  return [
    {
      title: 'Confirm the property setup',
      description: pickFor(ctx, 'hp0', [
        'Lavo reviews the building type, parking layout, access rules, and preferred service areas.',
        `Review ${name} garage or lot layout, access contacts, and approved wash zones.`,
        `Confirm how ${county} County properties document vendor access before launch.`,
      ]),
    },
    {
      title: 'Set building rules',
      description: pickFor(ctx, 'hp1', [
        'The property can define quiet hours, entry instructions, approved wash zones, garage restrictions, and resident communication guidelines.',
        'Post quiet hours, staging rules, and garage restrictions operators must follow.',
        'Align wash zones with existing parking and vendor policies.',
      ]),
    },
    {
      title: 'Launch to residents',
      description: pickFor(ctx, 'hp2', [
        'Lavo provides a resident facing booking path and request flow.',
        `Share one link or QR code with ${name} residents when the building goes live.`,
        'Residents request or book through the same building-specific path.',
      ]),
    },
    {
      title: 'Coordinate operator access',
      description: pickFor(ctx, 'hp3', [
        'Operators follow the building instructions instead of arriving as unapproved random vendors.',
        'Approved operators use your access playbook instead of ad hoc arrivals.',
        'Concierge or garage staff get predictable vendor windows.',
      ]),
    },
    {
      title: 'Keep the amenity simple',
      description: pickFor(ctx, 'hp4', [
        'Residents book and pay for their own services, while the property offers the convenience as an amenity.',
        'The building does not run wash logistics or handle resident payments.',
        'Staff focus on rules and access, not scheduling individual details.',
      ]),
    },
  ];
}

function operatorSteps(ctx: CityTemplateContext): NumberedStep[] {
  const { name, county, corridor } = ctx;
  return [
    {
      title: 'Apply to serve Lavo properties',
      description: pickFor(ctx, 'ho0', [
        'Operators can apply to join the network.',
        `Apply to serve apartment buildings in ${name} and ${county} County.`,
        'Join the network and specify the areas you want to serve.',
      ]),
    },
    {
      title: 'Accept building based opportunities',
      description: pickFor(ctx, 'ho1', [
        'Operators can serve apartment communities where resident demand exists.',
        `Take on ${name} buildings where management has approved service zones.`,
        'Focus on properties with documented parking and access rules.',
      ]),
    },
    {
      title: 'Follow property rules',
      description: pickFor(ctx, 'ho2', [
        'Operators must follow access, parking, safety, cleanup, quiet hour, and resident communication rules.',
        'Use each building wash zone, quiet hours, and contact list every visit.',
        'Follow insurance and vendor requirements the property sets.',
      ]),
    },
    {
      title: 'Build local route density',
      description: pickFor(ctx, 'ho3', [
        'Serving multiple residents at the same property can reduce wasted travel time.',
        `Pair ${name} with nearby stops along ${corridor} on the same day.`,
        'Stack building visits before driving to scattered retail jobs.',
      ]),
    },
  ];
}

export function buildHowItWorks(ctx: CityTemplateContext) {
  return {
    title: `How Lavo works in ${ctx.name}`,
    residents: residentSteps(ctx),
    propertyManagers: pmSteps(ctx),
    operators: operatorSteps(ctx),
  };
}
