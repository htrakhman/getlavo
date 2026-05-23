export type CityFaq = { question: string; answer: string };

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
