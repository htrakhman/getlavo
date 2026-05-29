import { KEEP_COUNTY_SLUGS } from '@/lib/seo/keep-cities';
import { getCountyProfile } from './county-profiles';
import { getKeptMunicipalitiesByCounty } from './nj-municipalities';
import { getCityTier } from './utils';
import type { CityFaq, CityPageViewModel } from './types';
import { trimMetaDescription } from './utils';

export type CountyPageViewModel = {
  county: string;
  countySlug: string;
  meta: { title: string; description: string; canonicalPath: string };
  h1: string;
  overview: { title: string; paragraphs: string[] };
  propertyTypes: CityPageViewModel['propertyTypes'];
  cities: { slug: string; name: string; tier: number }[];
  topCities: { slug: string; name: string }[];
  residentSection: { title: string; paragraphs: string[] };
  propertySection: { title: string; paragraphs: string[] };
  operatorSection: { title: string; paragraphs: string[] };
  faqs: CityFaq[];
  relatedLinks: { href: string; label: string }[];
};

export function getCountySlugs(): string[] {
  return [...KEEP_COUNTY_SLUGS];
}

export function buildCountyPage(countySlug: string): CountyPageViewModel | undefined {
  const municipalities = getKeptMunicipalitiesByCounty(countySlug);
  if (!municipalities.length) return undefined;

  const county = municipalities[0]!.county;
  const profile = getCountyProfile(countySlug);

  const cities = municipalities
    .map((m) => ({ slug: m.slug, name: m.name, tier: getCityTier(m) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const topCities = municipalities
    .map((m) => ({ slug: m.slug, name: m.name }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 8);

  const title = `Mobile Car Wash for Apartment Buildings in ${county} County, NJ | Lavo`;
  const description = trimMetaDescription(
    `Lavo helps ${county} County apartment residents book mobile car washes at building garages and parking areas while giving property managers a no cost resident amenity.`,
  );

  return {
    county,
    countySlug,
    meta: {
      title,
      description,
      canonicalPath: `/cities/counties/${countySlug}`,
    },
    h1: `Mobile Car Wash for Apartment Buildings in ${county} County`,
    overview: {
      title: `Overview of apartment car wash service in ${county} County`,
      paragraphs: [
        `${county} County sits in ${profile.region}, where apartment stock often includes ${profile.parking}. Buildings along ${profile.corridor} commonly see vehicle use from ${profile.commute}.`,
        `Lavo helps residents book mobile car wash and detailing at approved building garages, lots, and residential parking areas. Property managers can offer the program as a no cost amenity while residents book and pay for their own services.`,
        `Availability depends on building approval and local operator coverage. Residents can request Lavo at buildings that are not live yet, and property managers can submit properties for onboarding.`,
      ],
    },
    propertyTypes: {
      title: `Best fit property types in ${county} County`,
      rows: [
        {
          propertyType: 'High rise apartments',
          whyItWorks: 'Structured garages and convenience-focused residents',
          whatLavoNeeds: 'Garage access and building approval',
        },
        {
          propertyType: 'Garden apartment communities',
          whyItWorks: 'Surface lots can simplify operator access',
          whatLavoNeeds: 'Lot map and parking rules',
        },
        {
          propertyType: 'Mid rise and mixed use',
          whyItWorks: 'Assigned or managed parking',
          whatLavoNeeds: 'Approved service zones',
        },
      ],
    },
    cities,
    topCities,
    residentSection: {
      title: `How residents request Lavo in ${county} County`,
      paragraphs: [
        'Search for a building address on Lavo. If the property is not active, submit a request so Lavo can track demand and contact the property manager.',
      ],
    },
    propertySection: {
      title: `How property managers launch Lavo in ${county} County`,
      paragraphs: [
        'Submit property interest with parking layout and access rules. Lavo reviews the setup and coordinates operator availability when coverage exists.',
      ],
    },
    operatorSection: {
      title: `Operator route opportunities in ${county} County`,
      paragraphs: [
        `Operators can build routes that combine multiple ${county} County apartment communities on the same service day, especially along ${profile.corridor}.`,
      ],
    },
    faqs: [
      {
        question: `Does Lavo serve ${county} County?`,
        answer: `Lavo is building apartment based mobile car wash coverage in ${county} County. Availability depends on building approval and local operators.`,
      },
      {
        question: `Which ${county} County cities are on Lavo?`,
        answer: `Browse municipality pages below. Each page explains how residents, property managers, and operators can participate.`,
      },
      {
        question: `Is Lavo free for buildings in ${county} County?`,
        answer: 'Yes. Lavo is designed as a no cost amenity for property managers. Residents pay for services they book.',
      },
      {
        question: 'Can residents request a building?',
        answer: 'Yes. Residents can submit a building address to flag demand for property managers.',
      },
    ],
    relatedLinks: [
      { href: '/cities/new-jersey', label: 'Lavo in New Jersey' },
      { href: '/cities', label: 'All Lavo cities' },
      { href: '/buildings', label: 'For property managers' },
      { href: '/operators', label: 'For operators' },
      { href: '/residents', label: 'For residents' },
      { href: '/how-it-works', label: 'How Lavo works' },
    ],
  };
}

export function getCountyPageBySlug(countySlug: string): CountyPageViewModel | undefined {
  return buildCountyPage(countySlug);
}
