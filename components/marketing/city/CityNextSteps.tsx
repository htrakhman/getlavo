import Link from 'next/link';

type CityNextStepsProps = {
  cityName: string;
  citySlug: string;
  countySlug: string;
};

export function CityNextSteps({ cityName, citySlug, countySlug }: CityNextStepsProps) {
  return (
    <nav
      className="card mb-10 p-5"
      aria-label={`What to do next in ${cityName}`}
      data-page-type="city"
      data-city={citySlug}
      data-county={countySlug}
    >
      <p className="text-sm font-medium text-ink-100">What to do next in {cityName}</p>
      <ul className="mt-4 flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:gap-3">
        <li>
          <Link
            href="#request-lavo"
            className="text-gleam hover:underline"
            data-cta-type="city_page_resident_request_click"
          >
            Request Lavo at your building
          </Link>
        </li>
        <li>
          <Link
            href="/signup?role=building_manager"
            className="text-gleam hover:underline"
            data-cta-type="city_page_property_manager_click"
          >
            I manage a property in {cityName}
          </Link>
        </li>
        <li>
          <Link
            href="/signup?role=operator"
            className="text-gleam hover:underline"
            data-cta-type="city_page_operator_signup_click"
          >
            I&apos;m an operator near {cityName}
          </Link>
        </li>
      </ul>
    </nav>
  );
}
