/** True when `error` is a PostgreSQL unique violation (SQLSTATE 23505). */
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'sqlState' in error &&
    (error as { sqlState: unknown }).sqlState === '23505'
  );
}
