/**
 * Ranking, not filtering: preferred-language titles float to the top and
 * everything else keeps its relative order below. An empty or null preference
 * set is a no-op.
 */
export const rankByLanguage = <T extends { language?: { code?: string } | null }>(
  items: T[] | undefined,
  codes: string[] | null | undefined,
): T[] => {
  if (!Array.isArray(items) || !items.length) return items ?? [];
  if (!codes?.length) return items;

  const preferred = new Set(codes);

  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const aMatch = preferred.has(a.item?.language?.code ?? '') ? 0 : 1;
      const bMatch = preferred.has(b.item?.language?.code ?? '') ? 0 : 1;
      return aMatch - bMatch || a.index - b.index;
    })
    .map(({ item }) => item);
};

export type LanguageDisplayMode = 'RANK' | 'FILTER';

/**
 * Entry point for home-screen lists. `mode` mirrors the admin-managed
 * "language.displayMode" setting — "RANK" (default) surfaces preferred
 * languages first without hiding anything; "FILTER" drops everything that
 * isn't in the viewer's preferred set. A viewer with no preferences sees
 * everything regardless of mode.
 */
export const applyLanguagePreference = <T extends { language?: { code?: string } | null }>(
  items: T[] | undefined,
  codes: string[] | null | undefined,
  mode: LanguageDisplayMode = 'RANK',
): T[] => {
  if (!Array.isArray(items) || !items.length) return items ?? [];
  if (!codes?.length) return items;

  if (mode === 'FILTER') {
    const preferred = new Set(codes);
    return items.filter((item) => preferred.has(item?.language?.code ?? ''));
  }

  return rankByLanguage(items, codes);
};

/** "हिन्दी, मराठी and English" for the home indicator row. */
export const formatLanguageList = (labels: string[]): string => {
  if (labels.length <= 1) return labels[0] ?? '';
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
};