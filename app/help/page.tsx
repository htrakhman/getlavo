import Link from 'next/link';
import { ContentPageShell } from '@/components/marketing/ContentPageShell';
import { JsonLd } from '@/components/seo/JsonLd';
import { RelatedLinks } from '@/components/marketing/RelatedLinks';
import { SeoPageHeader } from '@/components/marketing/SeoPageHeader';
import { VisibleFaq } from '@/components/marketing/VisibleFaq';
import { breadcrumbSchema } from '@/lib/seo/schema';
import { createPageMetadata } from '@/lib/seo/site';

export const metadata = createPageMetadata({
  path: '/help',
  title: 'Lavo Help Center | Support for Residents, Buildings, and Operators',
  description:
    'Find help for Lavo bookings, building access, operator onboarding, payments, wash days, and resident support.',
});

const RESIDENT_FAQ = [
  {
    question: 'How do I book a wash?',
    answer:
      'Sign up through your building link, add your vehicle, then choose a building wash day or an open slot from your resident dashboard.',
  },
  {
    question: 'Do I need to be home?',
    answer:
      'Often no, if your building allows vendor access with the spot details you provide. Check your building instructions before booking.',
  },
  {
    question: 'How do I report an issue?',
    answer:
      'Use the in-app issue flow or email hello@getlavo.io with your booking date and photos.',
  },
];

const BUILDING_FAQ = [
  {
    question: 'What does the building pay?',
    answer: 'Nothing. Lavo is a no cost amenity for properties.',
  },
  {
    question: 'How do we launch?',
    answer:
      'Create the building profile, share the resident QR or link, and connect with an operator in your area.',
  },
  {
    question: 'Who handles resident complaints?',
    answer:
      'Lavo support coordinates booking issues. Damage reports follow the damage policy.',
  },
];

const OPERATOR_FAQ = [
  {
    question: 'How do I join?',
    answer: 'Apply at the operators page and complete onboarding, insurance, and Stripe setup.',
  },
  {
    question: 'How do payouts work?',
    answer:
      'Residents pay in app. Net earnings flow to your connected Stripe account per completed booking.',
  },
  {
    question: 'How do building partnerships start?',
    answer:
      'Accept requests from buildings in your radius or work with buildings already asking for Lavo.',
  },
];

export default function HelpPage() {
  return (
    <ContentPageShell>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Help', path: '/help' },
        ])}
      />
      <SeoPageHeader
        h1="Help center"
        opening="Find answers for residents, property managers, and mobile car wash operators. Email hello@getlavo.io for urgent issues."
      />
      <VisibleFaq title="Residents" items={RESIDENT_FAQ} />
      <VisibleFaq title="Buildings and property managers" items={BUILDING_FAQ} />
      <VisibleFaq title="Operators" items={OPERATOR_FAQ} />
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
        ]}
      />
    </ContentPageShell>
  );
}
