export type CityFaq = { question: string; answer: string; citySpecific?: boolean };

export type CityTier = 1 | 2 | 3;

export type CityEnrichment = {
  neighborhoods?: string[];
  nearbyRoads?: string[];
  nearbyTransit?: string;
  localVehicleCareFactors?: string[];
  overviewExtra?: string[];
};

export type AudienceCard = { title: string; bullets: string[] };

export type NumberedStep = { title: string; description: string };

export type PropertyTypeRow = {
  propertyType: string;
  whyItWorks: string;
  whatLavoNeeds: string;
};

export type ServiceRow = {
  service: string;
  bestFor: string;
  usuallyIncludes: string;
  notes: string;
};

export type CityPageViewModel = {
  slug: string;
  localName: string;
  county: string;
  countySlug: string;
  stateAbbreviation: 'NJ';
  tier: CityTier;
  meta: { title: string; description: string; canonicalPath: string };
  h1: string;
  hero: {
    subheadline: string;
    plainEnglish: string[];
    aeoSummary: string;
    trustLine: string;
  };
  atAGlance: Record<string, string>;
  overview: { title: string; paragraphs: string[] };
  audience: { title: string; cards: AudienceCard[] };
  howItWorks: {
    title: string;
    residents: NumberedStep[];
    propertyManagers: NumberedStep[];
    operators: NumberedStep[];
  };
  whyBuildings: { title: string; paragraphs: string[]; bullets: string[] };
  propertyTypes: { title: string; rows: PropertyTypeRow[] };
  parking: { title: string; paragraphs: string[]; checklist: string[] };
  residentBenefits: { title: string; paragraphs: string[]; bullets: string[] };
  propertyManagerBenefits: { title: string; paragraphs: string[]; bullets: string[] };
  services: { title: string; rows: ServiceRow[] };
  vehicleCare: { title: string; paragraphs: string[] };
  operators: { title: string; paragraphs: string[]; bullets: string[] };
  requestResident: { title: string; paragraphs: string[]; steps: string[] };
  launchProperty: { title: string; paragraphs: string[]; steps: string[] };
  faqs: CityFaq[];
  neighborhoodsSection?: {
    title: string;
    neighborhoods: string[];
    paragraph: string;
  };
  buildingsSection?: {
    title: string;
    paragraph: string;
    buildings: { name: string; slug: string | null; status: string }[];
  };
  operatorsSection?: {
    title: string;
    paragraph: string;
    operators: { name: string; slug: string }[];
    bullets: string[];
  };
  schedulingSection?: {
    title: string;
    paragraphs: string[];
  };
  nearbyCities: { slug: string; name: string }[];
  relatedLinks: { href: string; label: string }[];
  finalCta: {
    residentHeadline: string;
    propertyHeadline: string;
  };
};

/** @deprecated Legacy shape — use CityPageViewModel via buildCityPage */
export type CityPage = {
  slug: string;
  title: string;
  description: string;
  h1: string;
  opening: string;
  localName: string;
  county: string;
  countySlug: string;
  mobileCarWash: string[];
  residents: string[];
  buildings: string[];
  propertyManagers: string[];
  operators: string[];
  faqs: CityFaq[];
  request: string[];
};
