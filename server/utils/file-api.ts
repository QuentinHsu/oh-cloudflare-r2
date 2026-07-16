import type { BlobObject } from "@nuxthub/core/blob";
import type { H3Event } from "h3";
import type { ApiFailure, ApiSuccess, BlobFile } from "../../shared/types/files";
import { toApiFailure } from "./file-errors";

export function success<T>(data: T): ApiSuccess<T> {
  return { ok: true, data };
}

export function respondFileError(event: H3Event, error: unknown): ApiFailure {
  const failure = toApiFailure(error);
  setResponseStatus(event, failure.statusCode);
  return failure.body;
}

export function toClientBlobFile(file: BlobObject): BlobFile {
  return {
    pathname: file.pathname,
    contentType: file.contentType ?? "application/octet-stream",
    size: file.size ?? 0,
    uploadedAt: file.uploadedAt.toISOString(),
  };
}
