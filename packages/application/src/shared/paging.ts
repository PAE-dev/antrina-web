const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

export function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

export function parsePaging(query: { page?: number; pageSize?: number }) {
  const pageSize = clampInt(query.pageSize, DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
  const page = clampInt(query.page, 1, 1, 10_000);
  return { page, pageSize, limit: pageSize, offset: (page - 1) * pageSize };
}
