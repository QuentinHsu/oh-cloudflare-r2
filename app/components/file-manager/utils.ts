import type { FolderNode } from "./types";

export type FileLinkType = "raw" | "markdown";

export function normalizeDirectoryPath(path: string) {
  return path
    .trim()
    .replace(/\/{2,}/g, "/")
    .replace(/^\/+|\/+$/g, "");
}

export function getFileName(pathname: string) {
  const normalized = normalizeDirectoryPath(pathname);
  return normalized.split("/").pop() ?? "";
}

export function getParentDirectory(pathname: string) {
  const parts = normalizeDirectoryPath(pathname).split("/").filter(Boolean);
  return parts.slice(0, -1).join("/");
}

export function buildDestinationPath(directory: string, filename: string) {
  const normalizedDirectory = normalizeDirectoryPath(directory);
  const normalizedFilename = filename.trim();
  return normalizedDirectory ? `${normalizedDirectory}/${normalizedFilename}` : normalizedFilename;
}

export function buildFolderTree(folders: readonly string[]): FolderNode[] {
  const root: FolderNode[] = [];
  const normalizedFolders = [
    ...new Set(folders.map(normalizeDirectoryPath).filter(Boolean)),
  ].toSorted();

  for (const folderPath of normalizedFolders) {
    const parts = folderPath.split("/");
    let level = root;

    parts.forEach((name, index) => {
      const path = parts.slice(0, index + 1).join("/");
      let node = level.find((candidate) => candidate.name === name);
      if (!node) {
        node = { name, path, children: [] };
        level.push(node);
      }
      level = node.children;
    });
  }

  return root;
}

export function getExpandedParentPaths(path: string) {
  const parts = normalizeDirectoryPath(path).split("/").filter(Boolean);
  return parts.map((_, index) => parts.slice(0, index + 1).join("/"));
}

export function buildFileLink(origin: string, pathname: string, type: FileLinkType) {
  const url = `${origin.replace(/\/+$/g, "")}/api/blob/${pathname}`;
  return type === "markdown" ? `![${getFileName(pathname)}](${url})` : url;
}

export function getRequestErrorMessage(error: unknown) {
  if (!error || typeof error !== "object" || !("data" in error)) return undefined;
  const data = error.data;
  if (!data || typeof data !== "object" || !("message" in data)) return undefined;
  return typeof data.message === "string" && data.message.trim() ? data.message : undefined;
}
