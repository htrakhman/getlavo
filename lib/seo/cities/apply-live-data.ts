import { money } from '@/lib/format';
import { getMergedEnrichment } from './enrichment';
import { trimMetaDescription } from './utils';
import type { CityLiveData } from './city-live-data';
import type { CityFaq, CityPageViewModel } from './types';
import type { NjMunicipality } from './nj-municipalities';

const loggedSparse = new Set<string>();

export function logSparseCityContent(muni: NjMunicipality, page: CityPageViewModel): void {
  if (loggedSparse.has(muni.slug)) return;
  const enrichment = getMergedEnrichment(muni.slug);
  const hasIntro = Boolean(enrichment.overviewExtra?.length);
  const hasNeighborhoods = Boolean(enrichment.neighborhoods?.length);
  const hasBuildings = Boolean(page.buildingsSection?.buildings.length);
  const hasOperators = Boolean(page.operatorsSection?.operators.length);
  const cityFaqs = page.faqs.filter((f) => f.citySpecific).length;

  if (!hasIntro || (!hasNeighborhoods && !hasBuildings && !hasOperators) || cityFaqs < 2) {
    loggedSparse.add(muni.slug);
    console.warn(
      `[city-seo] sparse content for ${muni.name} (${muni.slug}): intro=${hasIntro} neighborhoods=${hasNeighborhoods} buildings=${hasBuildings} operators=${hasOperators} cityFaqs=${cityFaqs}`,
    );
  }
}

function buildCitySpecificFaqs(
  name: string,
  live: CityLiveData | null,
): CityFaq[] {
  const faqs: CityFaq[] = [];
  if (live?.buildings.length) {
    const sample = live.buildings
      .slice(0, 4)
      .map((b) => b.name)
      .join(', ');
    faqs.push({
      question: `Which ${name} apartment buildings are on Lavo?`,
      answer: `Lavo tracks demand and active service at properties in ${name}, including ${sample}${live.buildings.length > 4 ? ', and others' : ''}. Search your building address on Lavo to see live status or request service.`,
      citySpecific: true,
    });
  }
  if (live?.operators.length) {
    const names = live.operators.map((o) => o.name).join(', ');
    faqs.push({
      question: `Who provides mobile car wash at ${name} buildings on Lavo?`,
      answer: `Approved operators serving ${name} on Lavo include ${names}. Exact packages and availability depend on your building partnership and wash day schedule.`,
      citySpecific: true,
    });
  }
  return faqs;
}

export function applyLiveDataToCityPage(
  page: CityPageViewModel,
  muni: NjMunicipality,
  live: CityLiveData | null,
): CityPageViewModel {
  const enrichment = getMergedEnrichment(muni.slug);
  const next = { ...page };

  if (enrichment.neighborhoods?.length) {
    next.neighborhoodsSection = {
      title: `Neighborhoods and apartment areas in ${muni.name}`,
      neighborhoods: enrichment.neighborhoods,
      paragraph: `Lavo focuses on apartment buildings across ${muni.name}, including ${enrichment.neighborhoods.slice(0, 5).join(', ')}. Parking rules and garage formats vary by block, so each property sets approved service zones before residents book.`,
    };
  }

  if (live?.buildings.length) {
    next.buildingsSection = {
      title: `Apartment buildings in ${muni.name} on Lavo`,
      paragraph: `These ${muni.name} properties are in Lavo's building network (prospect, pilot, or active). Residents can search by address to book or request service.`,
      buildings: live.buildings,
    };
  }

  if (live?.operators.length) {
    const bullets = live.operators.map(
      (o) => `${o.name} serves Lavo buildings in ${muni.name} when partnerships are active.`,
    );
    if (live.pricingRangeCents) {
      const { min, max } = live.pricingRangeCents;
      bullets.push(
        `Typical resident wash pricing from active operators in this area starts around ${money(min)} and can reach ${money(max)} depending on package.`,
      );
    }
    next.operatorsSection = {
      title: `Mobile wash operators in ${muni.name}`,
      paragraph: `Lavo routes vetted operators to approved ${muni.name} buildings instead of scattered street detailers.`,
      operators: live.operators,
      bullets,
    };
  } else if (live?.pricingRangeCents) {
    const { min, max } = live.pricingRangeCents;
    next.schedulingSection = {
      title: `Pricing and scheduling in ${muni.name}`,
      paragraphs: [
        `When your building is active, residents book wash days in the app. Typical packages from operators in this area range from about ${money(min)} to ${money(max)} depending on service level.`,
      ],
    };
  }

  const cityFaqs = buildCitySpecificFaqs(muni.name, live);
  if (cityFaqs.length) {
    const rest = page.faqs.filter((f) => !f.citySpecific);
    next.faqs = [...cityFaqs, ...rest].slice(0, page.faqs.length + cityFaqs.length);
  }

  if (live?.buildings.length || live?.operators.length) {
    const bits: string[] = [];
    if (live.buildings.length) bits.push(`${live.buildings.length} tracked buildings`);
    if (live.operators.length) bits.push(`${live.operators.length} operator${live.operators.length === 1 ? '' : 's'}`);
    next.meta = {
      ...page.meta,
      description: trimMetaDescription(
        `${page.meta.description.replace(/\.$/, '')}. ${bits.join(', ')} in ${muni.name}.`,
      ),
    };
  }

  return next;
}
