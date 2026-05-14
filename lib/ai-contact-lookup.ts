type ClaudeResponse = {
  content?: Array<{ type: string; text?: string }>;
};

export type AiContact = {
  email?: string;
  phone?: string;
  website?: string;
  summary?: string;
};

/**
 * Best-effort: ask Claude (with web search) to find the management contact
 * for an apartment building. Returns undefined-fields when nothing is found
 * or when ANTHROPIC_API_KEY is not configured.
 */
export async function aiLookupBuildingContact({
  buildingName,
  formattedAddress,
}: {
  buildingName: string;
  formattedAddress: string;
}): Promise<AiContact> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return {};

  const prompt = `Find the property management contact for this apartment building. Return ONLY a single JSON object with keys "email", "phone", "website", "summary". If a value is unknown, use null. Do not include any other text.

Building: ${buildingName}
Address: ${formattedAddress}

Prefer a leasing-office or property-management email and phone over a generic sales line. Phone should be in US format like (555) 555-5555 if applicable.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) {
      console.error('aiLookupBuildingContact', res.status, await res.text().catch(() => ''));
      return {};
    }
    const data = (await res.json()) as ClaudeResponse;
    const text = (data.content ?? [])
      .filter((b) => b.type === 'text' && typeof b.text === 'string')
      .map((b) => b.text!)
      .join('\n');
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return {};
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    return {
      email: stringOrUndef(parsed.email),
      phone: stringOrUndef(parsed.phone),
      website: stringOrUndef(parsed.website),
      summary: stringOrUndef(parsed.summary),
    };
  } catch (e) {
    console.error('aiLookupBuildingContact failed', e);
    return {};
  }
}

function stringOrUndef(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  if (!trimmed || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'unknown') return undefined;
  return trimmed;
}
