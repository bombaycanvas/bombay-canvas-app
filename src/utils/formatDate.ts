/** Format an ISO date for display as e.g. "3 Sep 2026". Empty string when absent or unparseable, so callers can render it inline without guarding. */
export const formatDate = (dateString?: string | null): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};
