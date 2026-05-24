import Link from 'next/link';
import { CheckBuildingFlow } from '@/components/CheckBuildingFlow';

type CityHeroProps = {
  h1: string;
  subheadline: string;
  plainEnglish: string[];
  trustLine: string;
  citySlug: string;
  countySlug: string;
};

export function CityHero({
  h1,
  subheadline,
  plainEnglish,
  trustLine,
  citySlug,
  countySlug,
}: CityHeroProps) {
  return (
    <header className="mb-10">
      <h1 className="font-display text-3xl leading-tight text-ink-50 sm:text-4xl">{h1}</h1>
      <p className="mt-4 text-base leading-relaxed text-ink-200">{subheadline}</p>
      <ul className="mt-4 space-y-2 text-sm text-ink-300">
        {plainEnglish.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <div
        className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap"
        data-page-type="city"
        data-city={citySlug}
        data-county={countySlug}
      >
        <span className="sr-only">Request Lavo at your building</span>
        <Link
          href="/signup?role=building_manager"
          className="btn-ghost px-6 py-3 text-center text-sm"
          data-cta-type="city_page_property_manager_click"
        >
          I Manage a Property
        </Link>
        <Link
          href="/signup?role=operator"
          className="btn-ghost px-6 py-3 text-center text-sm"
          data-cta-type="city_page_operator_signup_click"
        >
          I&apos;m a Car Wash Operator
        </Link>
      </div>
      <div className="mt-8" id="request-lavo">
        <p className="mb-3 text-sm font-medium text-ink-100">Request Lavo at Your Building</p>
        <CheckBuildingFlow />
      </div>
      <p className="mt-6 text-xs text-ink-500">{trustLine}</p>
    </header>
  );
}
