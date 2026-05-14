import { NextRequest, NextResponse } from 'next/server';
import { placeDetails } from '@/lib/places-google';
import { aiLookupBuildingContact } from '@/lib/ai-contact-lookup';
import { rateLimit, clientIp, rateLimitResponse } from '@/lib/rate-limit';

/**
 * Returns the best-known contact info for an apartment building so the resident
 * can email or call the management. Order of preference:
 *   1. Google Place Details (phone, website)
 *   2. Claude with web search (email, phone, website) — only when no phone yet
 *      and ANTHROPIC_API_KEY is configured.
 */
export async function POST(req: NextRequest) {
  const rl = rateLimit(`bf-contact:${clientIp(req)}`, { limit: 10, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse(rl);

  const body = await req.json().catch(() => ({}));
  const placeId = typeof body.placeId === 'string' ? body.placeId : '';
  const buildingName = typeof body.buildingName === 'string' ? body.buildingName.trim() : '';
  const formattedAddress = typeof body.formattedAddress === 'string' ? body.formattedAddress.trim() : '';
  const useAi = body.useAi !== false;

  let phone: string | undefined;
  let website: string | undefined;
  let email: string | undefined;
  let aiSummary: string | undefined;

  if (placeId) {
    const details = await placeDetails(placeId);
    phone = details?.phone;
    website = details?.website;
  }

  if (useAi && !phone && (buildingName || formattedAddress)) {
    const ai = await aiLookupBuildingContact({ buildingName, formattedAddress });
    phone = phone ?? ai.phone;
    website = website ?? ai.website;
    email = ai.email;
    aiSummary = ai.summary;
  }

  return NextResponse.json({ phone, website, email, aiSummary });
}
