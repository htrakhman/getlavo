import Link from 'next/link';

const STEPS = [
  {
    num: 1,
    title: 'Book from your phone',
    body: 'Add your car, choose a wash time, and pay in a few taps.',
  },
  {
    num: 2,
    title: 'Drop your keys at the front desk',
    body: 'Leave your keys with your building’s front desk before your scheduled appointment.',
  },
  {
    num: 3,
    title: 'Your car gets washed',
    body: 'A vetted local team washes your car at your building, in its spot or in an approved wash area.',
  },
  {
    num: 4,
    title: 'Pick up your keys',
    body: 'Come back to a clean car — we let you know the moment the wash is complete.',
  },
] as const;

type FourStepGridProps = {
  id?: string;
  className?: string;
  title?: string;
  subtitle?: string;
  footerHref?: string;
  footerLabel?: string;
  /** 'accent' renders the whole section on a solid green panel (used on the homepage). */
  variant?: 'default' | 'accent';
};

export function FourStepGrid({
  id = 'how-lavo-works',
  className = '',
  title = 'How Lavo works',
  subtitle = 'Simple enough to understand in a few seconds.',
  footerHref,
  footerLabel,
  variant = 'default',
}: FourStepGridProps) {
  const accent = variant === 'accent';

  const content = (
    <>
      <div className="mx-auto max-w-2xl text-center">
        <h2
          className={
            accent
              ? 'font-display text-4xl font-bold tracking-tight text-teal-50 md:text-5xl'
              : 'font-display text-3xl font-semibold tracking-tight md:text-4xl'
          }
        >
          {title}
        </h2>
        <p className={`mx-auto mt-4 ${accent ? 'text-teal-100/90' : 'text-ink-300'}`}>{subtitle}</p>
      </div>
      <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {STEPS.map((step) => (
          <div key={step.num} className="card flex flex-col p-6">
            <span
              className={
                accent
                  ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-600 font-display text-lg font-semibold text-teal-50'
                  : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gleam/30 bg-gleam/10 font-display text-lg text-gleam'
              }
            >
              {step.num}
            </span>
            <h3 className="mt-4 font-display text-lg font-semibold text-ink-100">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-300">{step.body}</p>
          </div>
        ))}
      </div>
      {footerHref && footerLabel && (
        <p className="mt-10 text-center">
          <Link
            href={footerHref}
            className={
              accent
                ? 'text-sm font-medium text-teal-50 underline underline-offset-4 transition-colors hover:text-teal-100'
                : 'text-sm text-gleam transition-colors hover:text-gleam-300'
            }
          >
            {footerLabel} →
          </Link>
        </p>
      )}
    </>
  );

  if (accent) {
    return (
      <section id={id} className={`relative scroll-mt-24 px-6 py-16 ${className}`.trim()}>
        <div className="mx-auto max-w-6xl rounded-3xl bg-gradient-to-br from-teal-600 to-teal-800 px-6 py-14 shadow-card sm:px-10 md:px-14">
          {content}
        </div>
      </section>
    );
  }

  return (
    <section
      id={id}
      className={`relative mx-auto max-w-6xl scroll-mt-24 px-6 py-20 ${className}`.trim()}
    >
      {content}
    </section>
  );
}
