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

export interface FileListLike extends Array<File> {
  item(index: number): File | null;
}
