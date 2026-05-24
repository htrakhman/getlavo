export type WashDaysHubSettings = {
  empty_title?: string;
  empty_message?: string;
  crew_notes?: string;
};

export const WASH_DAYS_HUB_DEFAULTS: Required<Pick<WashDaysHubSettings, 'empty_title'>> = {
  empty_title: 'No wash days yet.',
};

export function parseWashDaysHub(raw: unknown): WashDaysHubSettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const pick = (key: keyof WashDaysHubSettings) => {
    const v = o[key];
    return typeof v === 'string' ? v.trim() : '';
  };
  return {
    empty_title: pick('empty_title') || undefined,
    empty_message: pick('empty_message') || undefined,
    crew_notes: pick('crew_notes') || undefined,
  };
}

export function washDaysHubHasContent(settings: WashDaysHubSettings): boolean {
  return Boolean(
    (settings.empty_message && settings.empty_message.length > 0) ||
      (settings.crew_notes && settings.crew_notes.length > 0) ||
      (settings.empty_title && settings.empty_title !== WASH_DAYS_HUB_DEFAULTS.empty_title),
  );
}
