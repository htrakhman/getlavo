import Link from 'next/link';
import { ContentPageShell } from '@/components/marketing/ContentPageShell';
import { JsonLd } from '@/components/seo/JsonLd';
import { RelatedLinks } from '@/components/marketing/RelatedLinks';
import { SeoPageHeader } from '@/components/marketing/SeoPageHeader';
import { VisibleFaq } from '@/components/marketing/VisibleFaq';
import { breadcrumbSchema, faqPageSchema } from '@/lib/seo/schema';
import { createPageMetadata } from '@/lib/seo/site';
import { resolveSplit } from '@/lib/stripe/connect-split';

export const metadata = createPageMetadata({
  path: '/help',
  title: 'Lavo Help Center | Support for Residents, Buildings, and Operators',
  description:
    'Find help for Lavo bookings, building access, operator onboarding, payments, wash days, and resident support.',
});

type HelpCategory = {
  title: string;
  items: { question: string; answer: string }[];
};

/**
 * Worked payout figures for the operator answers below, computed from the split
 * checkout actually charges (lib/stripe/connect-split.ts) instead of typed into
 * prose. A change to the take rate or the processing estimate moves these with
 * it, so the help centre can never quote an operator a number Lavo won't pay.
 */
const payoutExamples = [3500, 7000, 14000]
  .map((gross) => resolveSplit(gross))
  .map((s) => `$${(s.grossCents / 100).toFixed(2)} pays out $${(s.netCents / 100).toFixed(2)}`)
  .join(', ');

/**
 * Categorized by ICP: residents book, property managers launch and report,
 * operators earn. Every question here is answered on the page itself, which is
 * what the FAQPage markup below asserts.
 */
const HELP_CATEGORIES: HelpCategory[] = [
  {
    title: 'Residents: booking and wash days',
    items: [
      {
        question: 'How do I book a wash?',
        answer:
          'Sign up through your building link, add your vehicle, then choose a building wash day or an open slot from your resident dashboard.',
      },
      {
        question: 'Do I need to be home?',
        answer:
          'Often no, if your building allows vendor access with the spot details you provide. Many residents leave keys with the front desk. Check your building instructions before booking.',
      },
      {
        question: 'What does a wash cost?',
        answer:
          'Your operator sets the price. Scheduled building wash days are cheaper than on-demand slots because the operator serves several vehicles in one visit. The exact price is shown before you pay.',
      },
      {
        question: 'How do I know the wash happened?',
        answer:
          'Your operator uploads before-and-after photos to the booking and marks it complete. You get a notification the moment it is done.',
      },
      {
        question: 'Can I cancel or reschedule?',
        answer:
          'Yes. Cancel from your resident portal up to 24 hours before your scheduled slot, per our terms. Rescheduling follows the same window.',
      },
      {
        question: 'What if my building is not on Lavo yet?',
        answer:
          'Search your address and submit a request. Lavo tracks resident demand by address, contacts the property, and notifies you when an operator activates your building.',
      },
      {
        question: 'How do I report an issue or damage?',
        answer:
          'Use the issue flow in your resident portal or email hello@getlavo.io with your booking date and photos. Damage reports follow the damage policy.',
      },
    ],
  },
  {
    title: 'Property managers: launching and running the amenity',
    items: [
      {
        question: 'What does the building pay?',
        answer:
          'Nothing. Lavo is a no cost amenity for properties. Residents pay for the washes they book, and Lavo handles operator payouts.',
      },
      {
        question: 'How do we launch?',
        answer:
          'Create the building profile, share the resident QR code or link, and connect with an operator in your area. Setup takes about five minutes and residents can sign up the same day.',
      },
      {
        question: 'How do we choose an operator?',
        answer:
          'Browse operators whose service radius covers your building, then send a partnership request. The partnership goes live once the operator accepts. You can request a different partner later.',
      },
      {
        question: 'Is there a minimum unit count?',
        answer:
          'No. A building with 10 units and one with 300 get the same free service and the same dashboard.',
      },
      {
        question: 'What insurance do operators carry?',
        answer:
          'General liability and commercial auto coverage. Lavo keeps a certificate of insurance on file naming your building as additional insured, and tracks its expiration date.',
      },
      {
        question: 'Who handles resident complaints?',
        answer:
          'Lavo support coordinates booking issues so your staff is not in the middle. Damage reports follow the damage policy.',
      },
      {
        question: 'What reporting do we get?',
        answer:
          'Your dashboard shows total washes booked and resident adoption — one clean number to bring to leadership, with no monthly work on your side.',
      },
    ],
  },
  {
    title: 'Operators: onboarding, payouts, and partnerships',
    items: [
      {
        question: 'How do I join?',
        answer:
          'Apply at the operators page and complete onboarding, insurance, and Stripe setup. Lavo reviews the application and lists you to buildings inside your service radius.',
      },
      {
        question: 'How do payouts work?',
        answer:
          'Residents pay in the app. Net earnings flow to your connected Stripe account per completed booking. Your earnings dashboard breaks out gross, fees, and net.',
      },
      {
        question: 'What does Lavo charge?',
        answer:
          `Lavo takes 10% of each booking. Card processing on that payment (2.9% + 30¢) comes out of your share as well, so your payout is the wash price minus 10% minus processing: ${payoutExamples}. The flat 30¢ counts for less as the price rises, so your share of a typical wash lands near 87%. There is no subscription, no lead fee, and no marketing spend required.`,
      },
      {
        question: 'Why is my Stripe payout less than the booking price?',
        answer:
          'Stripe records each resident payment as a transfer of the full booking amount to your connected account, then an application fee that Lavo collects back out of it. Your take-home is the transfer minus that application fee, which Stripe never shows as its own line. Your Lavo earnings dashboard breaks out gross, fee, and net directly.',
      },
      {
        question: 'How do building partnerships start?',
        answer:
          'Accept requests from buildings in your radius, or work with buildings already asking for Lavo in your area. You can decline any request that does not fit your route or capacity.',
      },
      {
        question: 'What insurance do I need to provide?',
        answer:
          'General liability and commercial auto coverage. Upload your certificate of insurance during onboarding. Lavo alerts you before it expires so partnerships stay active.',
      },
      {
        question: 'How do wash days work?',
        answer:
          'A partnered building schedules recurring wash days. Your crew tool lists every vehicle for the day with the resident, spot label, make, model, color, and plate, so the whole visit runs from one screen.',
      },
      {
        question: 'Can I offer add-on services?',
        answer:
          'Yes. Offer extras such as interior detail, wax, or tire shine. They are billed through Stripe alongside the wash, and you keep the proceeds minus the platform fee.',
      },
    ],
  },
];

const ALL_HELP_FAQS = HELP_CATEGORIES.flatMap((c) => c.items);

export default function HelpPage() {
  return (
    <ContentPageShell>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Help', path: '/help' },
          ]),
          faqPageSchema('/help', ALL_HELP_FAQS),
        ]}
      />
      <SeoPageHeader
        h1="Help center"
        opening="Find answers for residents, property managers, and mobile car wash operators. Email hello@getlavo.io for urgent issues."
      />
      {HELP_CATEGORIES.map((category) => (
        <VisibleFaq key={category.title} title={category.title} items={category.items} />
      ))}
      <p className="mb-10 text-sm text-ink-300">
        More detail:{' '}
        <Link href="/how-it-works" className="text-gleam hover:underline">
          How it works
        </Link>
        ,{' '}
        <Link href="/legal/damage-policy" className="text-gleam hover:underline">
          Damage policy
        </Link>
        ,{' '}
        <Link href="/contact" className="text-gleam hover:underline">
          Contact
        </Link>
        .
      </p>
      <RelatedLinks
        links={[
          { href: '/how-it-works', label: 'How it works' },
          { href: '/contact', label: 'Contact' },
          { href: '/buildings', label: 'For properties' },
          { href: '/operators', label: 'For operators' },
          { href: '/residents', label: 'For residents' },
        ]}
      />
    </ContentPageShell>
  );
}
