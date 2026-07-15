export function normalizeDirectoryPrefix(value: unknown): string {
  if (typeof value !== "string") return "";
  const normalized = value.split("/").filter(Boolean).join("/");
  return normalized ? `${normalized}/` : "";
}

export function toRelativeFolderName(folderPath: string, prefix: string): string | null {
  const relativePath =
    prefix && folderPath.startsWith(prefix) ? folderPath.slice(prefix.length) : folderPath;
  return relativePath.split("/").find(Boolean) ?? null;
}
