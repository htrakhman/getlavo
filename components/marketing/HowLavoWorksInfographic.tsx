import Image from 'next/image';

const INFOGRAPHIC_ALT =
  'How Lavo Works infographic: buildings add Lavo for free and share a QR code, residents book washes in the app, operators run wash days on site. Shows the Lavo platform connecting setup, booking, wash day, vehicle, parking spot, operator match, review, and payout, plus four steps from setup through book, wash day, and done.';

type Props = {
  priority?: boolean;
  className?: string;
};

/** Full “How Lavo Works” visual from design (platform diagram + four steps). */
export function HowLavoWorksInfographic({ priority = false, className = '' }: Props) {
  return (
    <figure className={`mx-auto w-full max-w-6xl ${className}`.trim()}>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-ink-950 shadow-card ring-1 ring-inset ring-white/[0.06]">
        <Image
          src="/how-lavo-works.png"
          alt={INFOGRAPHIC_ALT}
          width={1024}
          height={576}
          className="h-auto w-full"
          priority={priority}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1152px"
        />
      </div>
      <figcaption className="sr-only">{INFOGRAPHIC_ALT}</figcaption>
    </figure>
  );
}
