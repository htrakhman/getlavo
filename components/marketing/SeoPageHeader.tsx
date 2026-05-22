type SeoPageHeaderProps = {
  h1: string;
  opening: string;
};

export function SeoPageHeader({ h1, opening }: SeoPageHeaderProps) {
  return (
    <header className="mb-10">
      <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">{h1}</h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-300">{opening}</p>
    </header>
  );
}
