'use client';
import { useEffect, useRef, useState } from 'react';

type PhotonFeature = {
  properties: {
    name?: string;
    housenumber?: string;
    street?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
    country?: string;
    countrycode?: string;
    osm_value?: string;
    osm_key?: string;
  };
  geometry: { coordinates: [number, number] };
};

export type ParsedAddress = {
  name: string;
  street: string;
  city: string;
  state: string;
  postal: string;
  lat: number | null;
  lng: number | null;
};

function parseFeature(f: PhotonFeature): ParsedAddress {
  const p = f.properties;
  const street = [p.housenumber, p.street].filter(Boolean).join(' ');
  const [lng, lat] = f.geometry.coordinates;
  return {
    name: p.name ?? '',
    street: street || p.name || '',
    city: p.city ?? p.town ?? p.village ?? '',
    state: p.state ?? '',
    postal: p.postcode ?? '',
    lat: typeof lat === 'number' ? lat : null,
    lng: typeof lng === 'number' ? lng : null,
  };
}

function formatLine(f: PhotonFeature): string {
  const p = f.properties;
  const head = p.name && (p.housenumber || p.street)
    ? `${p.name} — ${[p.housenumber, p.street].filter(Boolean).join(' ')}`
    : p.name || [p.housenumber, p.street].filter(Boolean).join(' ');
  const tail = [p.city ?? p.town ?? p.village, p.state, p.postcode].filter(Boolean).join(', ');
  return [head, tail].filter(Boolean).join(', ');
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  mode = 'address',
  className = 'field',
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (a: ParsedAddress) => void;
  placeholder?: string;
  mode?: 'address' | 'place';
  className?: string;
}) {
  const [suggestions, setSuggestions] = useState<PhotonFeature[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const lastQuery = useRef('');

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 3) { setSuggestions([]); return; }
    if (q === lastQuery.current) return;
    const t = setTimeout(async () => {
      lastQuery.current = q;
      try {
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lang=en`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        let feats: PhotonFeature[] = data.features ?? [];
        if (mode === 'address') {
          feats = feats.filter((f) => f.properties.street || f.properties.housenumber || f.properties.osm_key === 'place');
        }
        setSuggestions(feats);
        setOpen(true);
        setHighlight(0);
      } catch {/* ignore */}
    }, 220);
    return () => clearTimeout(t);
  }, [value, mode]);

  function pick(f: PhotonFeature) {
    const parsed = parseFeature(f);
    onSelect(parsed);
    setOpen(false);
    setSuggestions([]);
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        className={className}
        value={value}
        placeholder={placeholder}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => suggestions.length && setOpen(true)}
        onKeyDown={(e) => {
          if (!open || !suggestions.length) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((h) => (h + 1) % suggestions.length); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length); }
          else if (e.key === 'Enter') { e.preventDefault(); pick(suggestions[highlight]); }
          else if (e.key === 'Escape') { setOpen(false); }
        }}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-white/10 bg-ink-900/95 backdrop-blur shadow-xl">
          {suggestions.map((f, i) => (
            <li
              key={i}
              onMouseDown={(e) => { e.preventDefault(); pick(f); }}
              onMouseEnter={() => setHighlight(i)}
              className={`cursor-pointer px-3 py-2 text-sm ${i === highlight ? 'bg-gleam/15 text-white' : 'text-ink-200'}`}
            >
              {formatLine(f)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
