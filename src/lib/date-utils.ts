export function normalizeOptionalDate(value?: string | null): string | null {
  if (!value?.trim()) return null;
  return value.trim();
}
