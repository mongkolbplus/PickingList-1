export function parseQtyInput(value: string, fallback = 1): number {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
}

export function clampQty(value: number, min = 1, max?: number): number {
  const next = Math.max(min, Math.floor(value));
  if (max != null) return Math.min(next, max);
  return next;
}
