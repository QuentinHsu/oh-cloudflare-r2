export type FileErrorCode =
  | "INVALID_PATH"
  | "INVALID_FILE"
  | "SOURCE_NOT_FOUND"
  | "DESTINATION_EXISTS"
  | "SOURCE_EQUALS_DESTINATION"
  | "STORAGE_READ_FAILED"
  | "STORAGE_WRITE_FAILED"
  | "STORAGE_DELETE_FAILED"
  | "MOVE_PARTIALLY_COMPLETED"
  | "UNAUTHORIZED"
  | "FORBIDDEN";

export interface FileApiError {
  code: FileErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = { ok: false; error: FileApiError };
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface BlobFile {
  pathname: string;
  contentType: string;
  size: number;
  uploadedAt: string;
}

export interface FilesResponse {
  folders: string[];
  files: BlobFile[];
  currentPath: string;
}

export type FileOperation =
  | { action: "move"; source: string; destination: string }
  | { action: "delete"; path: string };

export type BatchOperationResult =
  | { operation: FileOperation; ok: true }
  | {
      operation: FileOperation;
      ok: false;
      error: FileApiError & { recoverable: boolean };
    };

export interface BatchResult {
  results: BatchOperationResult[];
}

export interface UploadResult {
  files: BlobFile[];
}
