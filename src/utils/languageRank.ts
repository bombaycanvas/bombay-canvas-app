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

/** "हिन्दी, मराठी and English" for the home indicator row. */
export const formatLanguageList = (labels: string[]): string => {
  if (labels.length <= 1) return labels[0] ?? '';
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
};
