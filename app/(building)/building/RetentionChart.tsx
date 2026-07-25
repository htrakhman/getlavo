'use client';

export function RetentionChart({ data }: { data: { month: string; value: number }[] }) {
  if (!data.length) return <p className="text-sm text-ink-400">Not enough history yet.</p>;
  const max = Math.max(1, ...data.map((d) => d.value));
  const w = 600;
  const h = 200;
  const pad = 28;

  const points = data.map((d, i) => {
    const x = pad + (i * (w - pad * 2)) / (data.length - 1 || 1);
    const y = h - pad - (d.value / max) * (h - pad * 2);
    return { x, y, ...d };
  });

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const area = `${path} L ${points[points.length - 1].x} ${h - pad} L ${points[0].x} ${h - pad} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      {/* horizontal gridlines */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <line key={t} x1={pad} x2={w - pad} y1={h - pad - t * (h - pad * 2)} y2={h - pad - t * (h - pad * 2)} stroke="#ffffff10" />
      ))}
      <path d={area} fill="#00e5c820" />
      <path d={path} stroke="#00e5c8" strokeWidth="2" fill="none" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3" fill="#00e5c8" />
          <text x={p.x} y={h - 6} textAnchor="middle" fontSize="10" fill="#999">{p.month.slice(5)}</text>
          <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="10" fill="#fff">{p.value}</text>
        </g>
      ))}
    </svg>
  );
}
