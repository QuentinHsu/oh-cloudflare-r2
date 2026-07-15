import type { BlobListOptions } from "@nuxthub/core/blob";

interface BlobListPage<T> {
  blobs: T[];
  folders?: string[];
  hasMore: boolean;
  cursor?: string;
}

interface BlobLister<T> {
  list: (options?: BlobListOptions) => Promise<BlobListPage<T>>;
}

export async function listAllBlobs<T>(
  storage: BlobLister<T>,
  options: Omit<BlobListOptions, "cursor"> = {},
): Promise<{ blobs: T[]; folders: string[] }> {
  const blobs: T[] = [];
  const folders = new Set<string>();
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const page = await storage.list({ ...options, ...(cursor ? { cursor } : {}) });
    blobs.push(...page.blobs);
    page.folders?.forEach((folder) => folders.add(folder));

    hasMore = page.hasMore;
    if (hasMore) {
      if (!page.cursor) throw new Error("Blob listing returned hasMore without a cursor");
      cursor = page.cursor;
    }
  }

  return { blobs, folders: [...folders] };
}
