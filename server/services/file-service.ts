import type { BlobObject } from "@nuxthub/core/blob";
import type {
  BatchOperationResult,
  BatchResult,
  FileErrorCode,
  FileOperation,
} from "../../shared/types/files";
import type { FileRepository } from "../repositories/blob-file-repository";
import { FileDomainError, isFileDomainError, toApiFailure } from "../utils/file-errors";
import {
  MAX_BATCH_OPERATIONS,
  MAX_UPLOAD_FILES,
  joinFilePath,
  parseDirectoryPath,
  parseFilePath,
} from "../utils/file-path";

const RECOVERABLE_CODES: ReadonlySet<FileErrorCode> = new Set([
  "INVALID_PATH",
  "SOURCE_NOT_FOUND",
  "DESTINATION_EXISTS",
  "SOURCE_EQUALS_DESTINATION",
  "MOVE_PARTIALLY_COMPLETED",
]);

export function createFileService(repository: FileRepository) {
  async function upload(directoryValue: unknown, files: File[]): Promise<BlobObject[]> {
    const directory = parseDirectoryPath(directoryValue);
    if (!files.length || files.length > MAX_UPLOAD_FILES) {
      throw new FileDomainError("INVALID_FILE");
    }

    const paths = files.map((file) => joinFilePath(directory, file.name));
    if (new Set(paths).size !== paths.length) {
      throw new FileDomainError("INVALID_FILE");
    }

    for (const path of paths) {
      try {
        if (await repository.read(path)) {
          throw new FileDomainError("DESTINATION_EXISTS", { path });
        }
      } catch (error: unknown) {
        if (isFileDomainError(error)) throw error;
        throw new FileDomainError("STORAGE_READ_FAILED");
      }
    }

    const uploaded: BlobObject[] = [];
    for (const [index, file] of files.entries()) {
      const path = paths[index]!;
      try {
        uploaded.push(await repository.write(path, file, file.type || "application/octet-stream"));
      } catch {
        throw new FileDomainError("STORAGE_WRITE_FAILED", { path });
      }
    }
    return uploaded;
  }

  async function move(sourceValue: unknown, destinationValue: unknown): Promise<void> {
    const source = parseFilePath(sourceValue);
    const destination = parseFilePath(destinationValue);
    if (source === destination) {
      throw new FileDomainError("SOURCE_EQUALS_DESTINATION");
    }

    let sourceBody: Blob | null;
    let destinationBody: Blob | null;
    try {
      sourceBody = await repository.read(source);
      if (!sourceBody) throw new FileDomainError("SOURCE_NOT_FOUND", { source });
      destinationBody = await repository.read(destination);
    } catch (error: unknown) {
      if (isFileDomainError(error)) throw error;
      throw new FileDomainError("STORAGE_READ_FAILED");
    }
    if (destinationBody) {
      throw new FileDomainError("DESTINATION_EXISTS", { destination });
    }

    try {
      await repository.write(
        destination,
        sourceBody,
        sourceBody.type || "application/octet-stream",
      );
    } catch {
      throw new FileDomainError("STORAGE_WRITE_FAILED", { destination });
    }

    try {
      await repository.remove(source);
    } catch {
      throw new FileDomainError("MOVE_PARTIALLY_COMPLETED", { source, destination });
    }
  }

  async function remove(pathValue: unknown): Promise<void> {
    const path = parseFilePath(pathValue);
    try {
      if (!(await repository.read(path))) {
        throw new FileDomainError("SOURCE_NOT_FOUND", { path });
      }
    } catch (error: unknown) {
      if (isFileDomainError(error)) throw error;
      throw new FileDomainError("STORAGE_READ_FAILED");
    }

    try {
      await repository.remove(path);
    } catch {
      throw new FileDomainError("STORAGE_DELETE_FAILED", { path });
    }
  }

  async function execute(operation: FileOperation): Promise<void> {
    if (operation.action === "move") {
      return move(operation.source, operation.destination);
    }
    return remove(operation.path);
  }

  async function batch(operations: FileOperation[]): Promise<BatchResult> {
    if (!operations.length || operations.length > MAX_BATCH_OPERATIONS) {
      throw new FileDomainError("INVALID_FILE");
    }

    const results: BatchOperationResult[] = [];
    for (const operation of operations) {
      try {
        await execute(operation);
        results.push({ operation, ok: true });
      } catch (error: unknown) {
        const failure = toApiFailure(error).body.error;
        results.push({
          operation,
          ok: false,
          error: {
            ...failure,
            recoverable: RECOVERABLE_CODES.has(failure.code),
          },
        });
      }
    }
    return { results };
  }

  return { upload, move, delete: remove, execute, batch };
}
