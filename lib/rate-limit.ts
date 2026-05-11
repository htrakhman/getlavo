// Simple sliding-window rate limiter. In-memory — fine for a single Vercel
// region with low traffic. Swap for Upstash Redis when you outgrow this.

type Entry = { hits: number[] };
const store = new Map<string, Entry>();

const sweepEvery = 60_000;
let lastSweep = Date.now();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetMs: number;
};

export function rateLimit(key: string, opts: { limit: number; windowMs: number }): RateLimitResult {
  const now = Date.now();
  if (now - lastSweep > sweepEvery) sweep(now);

  const cutoff = now - opts.windowMs;
  const entry = store.get(key) ?? { hits: [] };
  entry.hits = entry.hits.filter((t) => t > cutoff);
  if (entry.hits.length >= opts.limit) {
    const oldest = entry.hits[0];
    return { ok: false, remaining: 0, resetMs: opts.windowMs - (now - oldest) };
  }
  entry.hits.push(now);
  store.set(key, entry);
  return { ok: true, remaining: opts.limit - entry.hits.length, resetMs: opts.windowMs };
}

function sweep(now: number) {
  for (const [k, v] of store) {
    if (v.hits.length === 0 || now - v.hits[v.hits.length - 1] > 24 * 60 * 60 * 1000) {
      store.delete(k);
    }
  }
  lastSweep = now;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}

export function rateLimitResponse(result: RateLimitResult) {
  return new Response(JSON.stringify({ error: 'rate_limited', resetMs: result.resetMs }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': String(Math.ceil(result.resetMs / 1000)),
    },
  });
}
