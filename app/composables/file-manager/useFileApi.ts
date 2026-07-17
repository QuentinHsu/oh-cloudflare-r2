import type {
  BatchResult,
  FileApiError,
  FileErrorCode,
  FileOperation,
  UploadResult,
} from "../../../shared/types/files";

type Request = (url: string, options?: Record<string, unknown>) => Promise<unknown>;

const FILE_ERROR_CODES: ReadonlySet<FileErrorCode> = new Set([
  "INVALID_PATH",
  "INVALID_FILE",
  "SOURCE_NOT_FOUND",
  "DESTINATION_EXISTS",
  "SOURCE_EQUALS_DESTINATION",
  "STORAGE_READ_FAILED",
  "STORAGE_WRITE_FAILED",
  "STORAGE_DELETE_FAILED",
  "MOVE_PARTIALLY_COMPLETED",
  "UNAUTHORIZED",
  "FORBIDDEN",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function isFileApiError(value: unknown): value is FileApiError {
  return (
    isRecord(value) &&
    typeof value.code === "string" &&
    FILE_ERROR_CODES.has(value.code as FileErrorCode) &&
    typeof value.message === "string"
  );
}

function readFailureBody(value: unknown): FileApiError | null {
  if (!isRecord(value)) return null;
  if (value.ok === false && isFileApiError(value.error)) return value.error;
  if ("data" in value) return readFailureBody(value.data);
  return null;
}

const DEFAULT_STORAGE_ERROR = "Storage is temporarily unavailable";
type Translate = (key: string, values?: Record<string, unknown>) => string;

export function readFileApiError(
  error: unknown,
  fallbackMessage = DEFAULT_STORAGE_ERROR,
): FileApiError {
  if (isFileApiError(error)) return error;
  const failure = readFailureBody(error);
  return failure ?? { code: "STORAGE_READ_FAILED", message: fallbackMessage };
}

export function formatFileApiError(error: unknown, translate: Translate): string {
  const failure = readFileApiError(error);
  const source = typeof failure.details?.source === "string" ? failure.details.source : "";
  const destination =
    typeof failure.details?.destination === "string" ? failure.details.destination : "";

  return translate(`errors.file.${failure.code}`, { source, destination });
}

async function unwrap<T>(request: Promise<unknown>, fallbackMessage: string): Promise<T> {
  try {
    const response = await request;
    if (isRecord(response) && response.ok === true && "data" in response) {
      return response.data as T;
    }
    throw readFileApiError(response, fallbackMessage);
  } catch (error: unknown) {
    throw readFileApiError(error, fallbackMessage);
  }
}

export interface FileApi {
  upload(formData: FormData): Promise<UploadResult>;
  execute(operation: FileOperation): Promise<{ operation: FileOperation }>;
  batch(operations: FileOperation[]): Promise<BatchResult>;
}

export function createFileApi(request: Request, fallbackMessage = DEFAULT_STORAGE_ERROR): FileApi {
  return {
    upload(formData) {
      return unwrap<UploadResult>(
        request("/api/files/upload", { method: "POST", body: formData }),
        fallbackMessage,
      );
    },
    execute(operation) {
      return unwrap<{ operation: FileOperation }>(
        request("/api/files/operations", { method: "POST", body: operation }),
        fallbackMessage,
      );
    },
    batch(operations) {
      return unwrap<BatchResult>(
        request("/api/files/batch", { method: "POST", body: { operations } }),
        fallbackMessage,
      );
    },
  };
}
