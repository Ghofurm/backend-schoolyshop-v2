export function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const { code, cause } = error as { code?: unknown; cause?: unknown };

  return code === '23505' || isUniqueViolation(cause);
}
