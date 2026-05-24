import Link from 'next/link';

type CityFinalCtaProps = {
  residentHeadline: string;
  propertyHeadline: string;
  citySlug: string;
  countySlug: string;
};

export function CityFinalCta({
  residentHeadline,
  propertyHeadline,
  citySlug,
  countySlug,
}: CityFinalCtaProps) {
  return (
    <section
      className="card mb-10 p-6 sm:p-8"
      data-page-type="city"
      data-city={citySlug}
      data-county={countySlug}
    >
      <h2 className="font-display text-2xl text-ink-100">Bring Lavo to your building</h2>
      <p className="mt-4 text-sm leading-relaxed text-ink-300">{residentHeadline}</p>
      <p className="mt-4 text-sm leading-relaxed text-ink-300">{propertyHeadline}</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link
          href="#request-lavo"
          className="btn-primary px-6 py-3 text-center text-sm"
          data-cta-type="city_page_resident_request_click"
        >
          Request Lavo
        </Link>
        <Link
          href="/signup?role=building_manager"
          className="btn-ghost px-6 py-3 text-center text-sm"
          data-cta-type="city_page_property_manager_click"
        >
          Property Manager Inquiry
        </Link>
        <Link
          href="/signup?role=operator"
          className="btn-ghost px-6 py-3 text-center text-sm"
          data-cta-type="city_page_operator_signup_click"
        >
          Operator Signup
        </Link>
      </div>
    </section>
  );
}
