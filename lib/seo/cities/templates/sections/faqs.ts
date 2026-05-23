import { pickIndex } from '../../utils';
import { pick, type CityTemplateContext } from '../context';
import type { CityFaq } from '../../types';

export function buildFaqs(ctx: CityTemplateContext): CityFaq[] {
  const { name, county, muni } = ctx;

  const typeFaqs: CityFaq[] = [
    {
      question: `Does Lavo work in ${name} garden-style lots?`,
      answer: `Yes, when your ${name} building approves private parking areas and an operator is active in ${county} County. Surface spots and small lots both work with clear labeling.`,
    },
    {
      question: `Can ${name} high-rise garages use Lavo?`,
      answer: `High-rise garages in ${name} can work when management approves service zones, shares access rules, and coordinates floor-by-floor timing with operators.`,
    },
    {
      question: `What parking types qualify in ${name}?`,
      answer: `Lavo supports assigned spots, podiums, and structured garages in ${name} once ownership approves vendor access and residents provide stall details when booking.`,
    },
    {
      question: `Do ${name} condo or HOA communities qualify?`,
      answer: `Yes, when the HOA or manager approves service in managed parking areas and documents access rules for operators serving ${name}.`,
    },
  ];
  const typeFaq = typeFaqs[pickIndex(ctx.seed + 'fqti', typeFaqs.length)]!;

  const all: CityFaq[] = [
    {
      question: `Does Lavo offer mobile car wash service in ${name}?`,
      answer: `Lavo is building apartment based mobile car wash coverage in ${name}. Availability depends on whether your building is active, whether the property has approved service, and whether local operators are available.`,
    },
    {
      question: `Can I use Lavo if my apartment building in ${name} is not listed?`,
      answer: `Yes. If your building in ${name} is not live yet, you can submit a request with your building address. Lavo uses resident requests to understand demand and contact property managers.`,
    },
    {
      question: `Does my property manager in ${name} need to approve Lavo?`,
      answer: `For apartment garages, managed lots, and shared residential parking areas in ${name}, property approval is usually needed. This helps ensure operators follow access rules, quiet hours, service zones, and building policies.`,
    },
    {
      question: `Is Lavo free for apartment buildings in ${name}?`,
      answer: `Lavo is designed as a no cost amenity for property managers in ${name}. Residents book and pay for their own services, while the property can offer the convenience without hiring staff or building a wash bay.`,
    },
    {
      question: `Where does the car wash happen in ${name}?`,
      answer: `Service typically happens in an approved apartment garage, parking lot, assigned space, or designated building area in ${name}. The exact setup depends on the property's parking layout and rules.`,
    },
    {
      question: `Can Lavo wash cars in ${name} apartment garages?`,
      answer: `Lavo is built for apartment settings in ${name}, including garages and managed parking areas, but each property needs to approve where service can happen. Some buildings may prefer exterior lots or specific service zones.`,
    },
    {
      question: `What information does a ${name} resident need to book?`,
      answer: `Residents in ${name} may need to provide their building address, unit number, parking level, stall number, vehicle details, license plate, and any access instructions required by the property.`,
    },
    {
      question: `Can street parked cars in ${name} use Lavo?`,
      answer: `Street parked vehicles in ${name} may be harder to support because of parking rules, access, and local restrictions. Lavo works best when the property can provide an approved service area or managed parking location.`,
    },
    {
      question: `What services are available in ${name}?`,
      answer: `Services in ${name} may include exterior washes, interior refreshes, full washes, and detailing, depending on operator availability. Exact packages can vary by location and building.`,
    },
    {
      question: `How do operators get access to a ${name} building?`,
      answer: `Operators follow the property's approved access instructions for ${name} buildings. This may include garage entry rules, concierge instructions, loading area rules, quiet hours, or onsite contact information.`,
    },
    {
      question: `Is Lavo available for condo buildings or HOAs in ${name}?`,
      answer: `Yes, Lavo can work for condo communities and HOAs in ${name} when the community has a managed parking setup and the association or property manager approves the service.`,
    },
    {
      question: `How can property managers in ${name} get started?`,
      answer: `Property managers in ${name} can submit their building information, parking setup, and preferred service rules. Lavo will review the property and help coordinate a launch if operator coverage is available.`,
    },
    typeFaq,
  ];

  const count = ctx.tier === 1 ? 12 : ctx.tier === 2 ? 10 : 8;
  return all.slice(0, count);
}
