export type { BlobFile, FilesResponse } from "../../../shared/types/files";

export interface FolderNode {
  name: string;
  path: string;
  children: FolderNode[];
}

export interface CopyUrlPayload {
  pathname: string;
  type: "raw" | "markdown";
}
