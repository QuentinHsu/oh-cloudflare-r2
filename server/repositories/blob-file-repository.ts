import type { BlobListOptions, BlobObject, BlobStorage } from "@nuxthub/core/blob";
import { listAllBlobs } from "../utils/blob-list";

export interface FileRepository {
  list(options?: Omit<BlobListOptions, "cursor">): Promise<{
    blobs: BlobObject[];
    folders: string[];
  }>;
  read(path: string): Promise<Blob | null>;
  write(path: string, body: Blob, contentType: string): Promise<BlobObject>;
  remove(path: string): Promise<void>;
}

export function createBlobFileRepository(storage: BlobStorage): FileRepository {
  return {
    list: (options = {}) => listAllBlobs(storage, options),
    read: (path) => storage.get(path),
    write: (path, body, contentType) => storage.put(path, body, { contentType }),
    remove: (path) => storage.del(path),
  };
}
