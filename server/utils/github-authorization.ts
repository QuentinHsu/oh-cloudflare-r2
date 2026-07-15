export function parseAllowedGithubUserIds(value: unknown): Set<number> | null {
  if (typeof value !== "string" || !value.trim()) return null;

  const values = value.split(",").map((item) => item.trim());
  if (values.some((item) => !/^\d+$/.test(item))) return null;

  const ids = values.map(Number);
  if (ids.some((id) => !Number.isSafeInteger(id) || id <= 0)) return null;

  return new Set(ids);
}

export function isGithubUserAllowed(userId: number, value: unknown): boolean {
  return parseAllowedGithubUserIds(value)?.has(userId) ?? false;
}
