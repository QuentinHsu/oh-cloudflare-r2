import { FileDomainError } from "./file-errors";

export const MAX_BATCH_OPERATIONS = 100;
export const MAX_UPLOAD_FILES = 50;
export const MAX_FILE_NAME_BYTES = 255;
export const MAX_FILE_PATH_BYTES = 1024;

const encoder = new TextEncoder();

function hasControlCharacter(value: string) {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && (codePoint <= 0x1f || codePoint === 0x7f);
  });
}

function assertCanonicalSegments(path: string) {
  if (path.startsWith("/") || path.endsWith("/") || path.includes("//")) {
    throw new FileDomainError("INVALID_PATH");
  }
  if (path.includes("\\") || hasControlCharacter(path)) {
    throw new FileDomainError("INVALID_PATH");
  }

  const segments = path.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new FileDomainError("INVALID_PATH");
  }
  if (segments.some((segment) => encoder.encode(segment).length > MAX_FILE_NAME_BYTES)) {
    throw new FileDomainError("INVALID_PATH");
  }
  if (encoder.encode(path).length > MAX_FILE_PATH_BYTES) {
    throw new FileDomainError("INVALID_PATH");
  }
}

export function parseDirectoryPath(value: unknown) {
  if (value === undefined || value === "") return "";
  if (typeof value !== "string") throw new FileDomainError("INVALID_PATH");
  assertCanonicalSegments(value);
  return value;
}

export function parseFilePath(value: unknown) {
  if (typeof value !== "string" || !value) throw new FileDomainError("INVALID_PATH");
  assertCanonicalSegments(value);
  return value;
}

export function joinFilePath(directory: string, filename: string) {
  const path = directory ? `${parseDirectoryPath(directory)}/${filename}` : filename;
  return parseFilePath(path);
}

export function toBlobPrefix(directory: string) {
  return directory ? `${parseDirectoryPath(directory)}/` : "";
}

export function toRelativeFolderName(folderPath: string, prefix: string): string | null {
  const relativePath =
    prefix && folderPath.startsWith(prefix) ? folderPath.slice(prefix.length) : folderPath;
  return relativePath.split("/").find(Boolean) ?? null;
}

export function normalizeDirectoryPrefix(value: unknown): string {
  if (typeof value !== "string") return "";
  const normalized = value.split("/").filter(Boolean).join("/");
  return normalized ? `${normalized}/` : "";
}
