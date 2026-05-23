import type { CityTemplateContext } from '../context';
import type { PropertyTypeRow } from '../../types';

const ALL_ROWS: PropertyTypeRow[] = [
  {
    propertyType: 'High rise apartments',
    whyItWorks: 'Residents often park in structured garages and value convenience',
    whatLavoNeeds: 'Clear garage access, stall labeling, and building approval',
  },
  {
    propertyType: 'Mid rise apartment buildings',
    whyItWorks: 'Good fit when parking is assigned or managed',
    whatLavoNeeds: 'Approved service area and resident communication',
  },
  {
    propertyType: 'Garden apartment communities',
    whyItWorks: 'Surface lots can make vehicle access easier',
    whatLavoNeeds: 'Clear building map and parking rules',
  },
  {
    propertyType: 'Shore-area apartment towers',
    whyItWorks: 'Seasonal and year-round residents often use garages near the coast',
    whatLavoNeeds: 'Garage access rules, quiet hours, and runoff policies',
  },
  {
    propertyType: 'Mixed use buildings',
    whyItWorks: 'Residents may already use shared parking or garage systems',
    whatLavoNeeds: 'Defined service windows and vendor access process',
  },
  {
    propertyType: 'Condo communities',
    whyItWorks: 'Owners may value convenient recurring vehicle care',
    whatLavoNeeds: 'HOA or management approval',
  },
  {
    propertyType: 'Townhome communities',
    whyItWorks: 'Can work where parking is private, assigned, or community managed',
    whatLavoNeeds: 'Rules for driveways, lots, or shared parking areas',
  },
];

export function buildPropertyTypes(ctx: CityTemplateContext) {
  const { name, muni, flags } = ctx;
  let rows = [...ALL_ROWS];

  if (!flags.isShoreCounty) {
    rows = rows.filter((r) => r.propertyType !== 'Shore-area apartment towers');
  }

  if (muni.type === 'township' || muni.type === 'borough') {
    rows = rows.filter((r) => r.propertyType !== 'High rise apartments');
  }

  if (muni.type === 'city' && (flags.isHudsonWaterfront || flags.isGoldCoastBergen)) {
    rows = rows.filter((r) => r.propertyType !== 'Townhome communities');
  }

  if (rows.length > 5) {
    rows = rows.slice(0, 6);
  }

  return {
    title: `Best fit property types in ${name}`,
    rows,
  };
}
