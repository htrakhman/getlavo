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
 * All three sit on one 64x32 grid sharing a ground line, and are drawn to
 * scale against each other: the tier that costs more is visibly the bigger
 * vehicle. Roofline alone was not enough — a small SUV and a 3-row read as the
 * same thing until the small one also got shorter, so each has its own length
 * and wheelbase rather than being stretched to fill the box:
 *
 *   sedan  60 long, roof at 9    — long and low
 *   suv    50 long, roof at 6.5  — tall but clearly stubby
 *   xl     60 long, roof at 4.3  — long AND tall, the biggest of the three
 *
 * Keep any future tier near 3.5 body-lengths to one height. Past about 4 the
 * silhouette reads as a limousine no matter how the roofline is drawn.
 */

const GROUND = 24;

type Shape = {
  /** Body outline, ending at the front bottom corner. Arches are appended. */
  body: string;
  glass: string[];
  wheels: { cx: number; r: number }[];
};

const SHAPES: Record<VehicleSizeId, Shape> = {
  // Long, low, with a sloping tail and a distinct trunk deck.
  sedan: {
    body:
      'M2,24 L2,20.8 C2,19.4 2.8,18.4 4.2,18 L16,16.2 L23,10.2 C23.9,9.4 25,9 26.3,9 ' +
      'L38,9 C39.4,9 40.7,9.4 41.7,10.2 L48,16.2 L58.5,17.8 C60.8,18.2 62,19.5 62,21.2 L62,24',
    glass: ['M24.4,10.9 L30.5,10.9 L30.5,15.9 L19.2,15.9 Z', 'M32.5,10.9 L38.5,10.9 L44.3,15.9 L32.5,15.9 Z'],
    wheels: [{ cx: 17, r: 5.5 }, { cx: 48, r: 5.5 }],
  },
  // Compact crossover: upright like the big one, but 10 units shorter with a
  // tighter wheelbase and smaller wheels. The stubbiness is what keeps it from
  // reading as a 3-row.
  suv: {
    body:
      'M7,24 L7,11 C7,9.2 8.2,7.8 10,7.5 L38,6.9 C39.7,6.9 41.2,7.7 42.1,9.1 L45.4,14.6 ' +
      'L53.6,15.9 C55.8,16.3 57,17.7 57,19.5 L57,24',
    glass: ['M10.4,9.3 L24,9.1 L24,14.6 L10.4,14.6 Z', 'M25.8,9.1 L37.8,8.8 L41.4,14.6 L25.8,14.6 Z'],
    wheels: [{ cx: 19, r: 5 }, { cx: 45, r: 5 }],
  },
  // The big bracket — 3-row SUV, pickup and minivan priced together. Full
  // length, tallest roof, three rows of glass.
  xl: {
    body:
      'M2,24 L2,9.4 C2,7.3 3.4,5.7 5.5,5.4 L43,4.7 C45,4.7 46.8,5.7 47.8,7.4 L51,15 ' +
      'L59,16.6 C61.2,17 62,18.6 62,20.6 L62,24',
    glass: [
      'M5.9,7.3 L17.5,7.1 L17.5,15 L5.9,15 Z',
      'M19.5,7.1 L29.5,6.9 L29.5,15 L19.5,15 Z',
      'M31.5,6.9 L42.8,6.7 L47,15 L31.5,15 Z',
    ],
    wheels: [{ cx: 17, r: 5.5 }, { cx: 48, r: 5.5 }],
  },
};

/**
 * Close the body along the ground, cutting an arch over each wheel so the
 * wheels sit in the bodywork instead of on a flat sill. Derived from the wheel
 * positions rather than hand-written, so an arch can never drift off its wheel.
 */
function archPath(wheels: Shape['wheels']): string {
  return (
    [...wheels]
      .sort((a, b) => b.cx - a.cx) // right to left, following the path direction
      .map((w) => `L${w.cx + w.r},${GROUND} A${w.r},${w.r} 0 0 0 ${w.cx - w.r},${GROUND}`)
      .join(' ') + ' Z'
  );
}

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
      <path d={`${shape.body} ${archPath(shape.wheels)}`} />
      {shape.glass.map((d, i) => (
        <path key={i} d={d} fill="currentColor" opacity={0.18} stroke="none" />
      ))}
      {shape.wheels.map((w) => (
        <g key={w.cx}>
          <circle cx={w.cx} cy={GROUND} r={w.r} />
          <circle cx={w.cx} cy={GROUND} r={w.r * 0.36} fill="currentColor" opacity={0.35} stroke="none" />
        </g>
      ))}
    </svg>
  );
}
