import type { VehicleSizeId } from '@/lib/vehicle-sizes';

/**
 * Side-profile line art for the three vehicle pricing tiers, so an operator
 * setting rates (and a resident reading the menu) can tell the tiers apart at
 * a glance instead of parsing the labels.
 *
 * Drawn as inline SVG rather than shipped images: no asset requests, crisp at
 * any size, and stroked in currentColor so each icon takes the tone of
 * whatever it sits in — muted in a list, gleam when the tier is selected.
 *
 * All three share a 64x32 grid with wheels at x=17 / x=48, r=5.5, so the
 * silhouettes line up when stacked and read as one set. What separates them is
 * what actually separates the vehicles: roof height, length, and glass count.
 *
 * The grid is deliberately short: at roughly 3.5 body-lengths to one height a
 * silhouette reads as a car, and stretching it past ~4 turns any of them into
 * a limousine no matter how the roofline is drawn.
 */

const WHEEL_X = [17, 48];
const WHEEL_Y = 24;
const WHEEL_R = 5.5;

// Every body ends with the two wheel arches, so the wheels sit in cutouts
// rather than on top of a flat sill.
const ARCHES = 'L53.5,24 A5.5,5.5 0 0 0 42.5,24 L22.5,24 A5.5,5.5 0 0 0 11.5,24 Z';

const SHAPES: Record<VehicleSizeId, { body: string; glass: string[] }> = {
  // Low roofline, sloping tail, distinct trunk deck.
  sedan: {
    body:
      'M2,24 L2,20.5 C2,19 2.8,18 4.2,17.6 L16,15.6 L23,9 C23.9,8.1 25,7.6 26.3,7.6 ' +
      'L38,7.6 C39.4,7.6 40.7,8.1 41.7,9 L48,15.6 L58.5,17.4 C60.8,17.8 62,19.2 62,21 L62,24 ' +
      ARCHES,
    glass: ['M24.2,9.6 L30.5,9.6 L30.5,15.2 L18.8,15.2 Z', 'M32.5,9.6 L38.5,9.6 L44.6,15.2 L32.5,15.2 Z'],
  },
  // Upright rear, taller cabin, two rows of glass, and — the cue that keeps it
  // from reading as a wagon — a short, high, flat hood over the front wheel
  // ending in a tall blunt nose.
  suv: {
    body:
      'M2,24 L2,10.5 C2,8.4 3.4,6.8 5.5,6.5 L40,5.8 C41.9,5.8 43.6,6.7 44.6,8.3 L48.4,15 ' +
      'L58.8,16.6 C61,17 62,18.6 62,20.6 L62,24 ' +
      ARCHES,
    glass: [
      'M5.9,8.4 L20,8.1 L20,15 L5.9,15 Z',
      'M22,8.1 L34,7.9 L34,15 L22,15 Z',
      'M36,7.9 L39.8,7.8 L44,15 L36,15 Z',
    ],
  },
  // The big bracket — 3-row SUV, pickup and minivan priced together. Drawn as
  // the body they share: taller roof than the SUV, a third row of glass, and a
  // more upright windshield sitting further forward.
  xl: {
    body:
      'M2,24 L2,9.4 C2,7.3 3.4,5.7 5.5,5.4 L43,4.7 C45,4.7 46.8,5.7 47.8,7.4 L51,15 ' +
      'L59,16.6 C61.2,17 62,18.6 62,20.6 L62,24 ' +
      ARCHES,
    glass: [
      'M5.9,7.3 L17.5,7.1 L17.5,15 L5.9,15 Z',
      'M19.5,7.1 L29.5,6.9 L29.5,15 L19.5,15 Z',
      'M31.5,6.9 L42.8,6.7 L47,15 L31.5,15 Z',
    ],
  },
};

export function VehicleTypeIcon({
  type,
  className = '',
  title,
}: {
  type: VehicleSizeId;
  className?: string;
  title?: string;
}) {
  const shape = SHAPES[type];
  if (!shape) return null;

  return (
    <svg
      viewBox="0 0 64 32"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinejoin="round"
      strokeLinecap="round"
      // Decorative by default: each icon sits beside its own text label, so
      // announcing it again would just double up for a screen reader.
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      <path d={shape.body} />
      {shape.glass.map((d, i) => (
        <path key={i} d={d} fill="currentColor" opacity={0.18} stroke="none" />
      ))}
      {WHEEL_X.map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy={WHEEL_Y} r={WHEEL_R} />
          <circle cx={cx} cy={WHEEL_Y} r={2} fill="currentColor" opacity={0.35} stroke="none" />
        </g>
      ))}
    </svg>
  );
}
