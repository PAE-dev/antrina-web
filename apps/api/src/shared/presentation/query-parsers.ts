export function parseBoolean(value: string | undefined): boolean {
  return value === 'true' || value === '1';
}

export function parsePositiveInt(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}
