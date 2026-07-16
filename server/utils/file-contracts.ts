import type { FileOperation } from "../../shared/types/files";
import { FileDomainError } from "./file-errors";
import { parseFilePath } from "./file-path";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

export function parseFileOperation(value: unknown): FileOperation {
  if (!isRecord(value)) throw new FileDomainError("INVALID_FILE");

  if (value.action === "move") {
    if (!("source" in value) || !("destination" in value)) {
      throw new FileDomainError("INVALID_FILE");
    }
    return {
      action: "move",
      source: parseFilePath(value.source),
      destination: parseFilePath(value.destination),
    };
  }

  if (value.action === "delete") {
    if (!("path" in value)) throw new FileDomainError("INVALID_FILE");
    return { action: "delete", path: parseFilePath(value.path) };
  }

  throw new FileDomainError("INVALID_FILE");
}

export function parseBatchOperations(value: unknown): FileOperation[] {
  if (!isRecord(value) || !Array.isArray(value.operations)) {
    throw new FileDomainError("INVALID_FILE");
  }
  return value.operations.map(parseFileOperation);
}
