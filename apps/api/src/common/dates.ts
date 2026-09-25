/** Converts a PostgreSQL timestamptz string ("2026-01-01 10:00:00+00") to ISO 8601. */
export function toIso(value: string): string {
  return new Date(value).toISOString();
}
