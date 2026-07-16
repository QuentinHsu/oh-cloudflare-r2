# File Domain Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild file operations around validated paths, typed API contracts, a testable R2 repository, recoverable service workflows, server-side batch execution, and focused frontend composables.

**Architecture:** Management API handlers parse requests and convert domain results to HTTP responses, `file-service.ts` owns operation rules, and `blob-file-repository.ts` is the only management module that calls NuxtHub Blob. Shared discriminated unions define the browser/server contract, while the frontend separates transport, upload, single-file, and batch state.

**Tech Stack:** Nuxt 4, Vue 3, TypeScript, NuxtHub Blob on Cloudflare R2, Vitest, Vue Test Utils, Oxfmt, Oxlint.

## Global Constraints

- Management API compatibility is not required; the frontend must migrate in the same plan.
- Keep public `/api/blob/**` and `/images/**` URL structures unchanged.
- Do not add runtime dependencies, Pinia, D1, KV, or another persistence layer.
- API handlers must not call NuxtHub Blob methods directly.
- File paths use no leading or trailing slash; the root directory is the empty string.
- Reject `.`, `..`, backslashes, control characters, empty segments, and implicit overwrite.
- A batch request contains at most 100 operations.
- An upload contains at most 50 files.
- UTF-8 file names contain at most 255 bytes; complete paths contain at most 1024 bytes.
- Batch writes execute sequentially.
- Moving is copy-then-delete; copy success plus delete failure returns `MOVE_PARTIALLY_COMPLETED` without compensation deletion.
- Management APIs continue to require `session.user` and `authorized === true`.
- Use `unknown`, type guards, and discriminated unions; do not introduce `any` in project code.
- Follow red-green-refactor for every production behavior change.
- At the end of every task, stage only that task's files and use `/commit-message en auto` to normalize and create an English Conventional Commit.

---

## File Map

- `shared/types/files.ts`: browser/server request, response, operation, batch, and error-code contracts.
- `server/utils/file-path.ts`: strict directory/file path parsing and UTF-8 limits.
- `server/utils/file-errors.ts`: typed domain errors, status mapping, and safe API failure conversion.
- `server/repositories/blob-file-repository.ts`: minimal repository interface and NuxtHub Blob adapter.
- `server/services/file-service.ts`: upload, delete, move, and sequential batch workflows.
- `server/api/files/index.get.ts`: current-directory listing through the repository.
- `server/api/files/folders.get.ts`: complete folder index through the repository.
- `server/api/files/upload.post.ts`: multipart parsing and upload service call.
- `server/api/files/operations.post.ts`: single move/delete endpoint.
- `server/api/files/batch.post.ts`: server-side batch endpoint.
- `server/middleware/auth.ts`: stable authorization error codes.
- `server/utils/origin-policy.ts`: pure Origin/Referer parsing and wildcard matching.
- `server/middleware/cors.ts`: public-resource origin enforcement using the pure policy.
- `server/routes/api/blob/[...pathname].get.ts`: validated public Blob path.
- `server/routes/images/[...pathname].get.ts`: validated public image path.
- `app/composables/file-manager/useFileApi.ts`: typed transport and error decoding.
- `app/composables/file-manager/useFileUpload.ts`: pending upload state and retry behavior.
- `app/composables/file-manager/useFileOperations.ts`: delete, move, and rename state.
- `app/composables/file-manager/useBatchFileOperations.ts`: batch state and failed-selection preservation.
- `app/components/FileManager.vue`: composition root for the new composables.
- `app/composables/file-manager/useFolderBrowser.ts`: canonical directory paths without trailing slash.
- `app/components/file-manager/types.ts`: re-exports `BlobFile` and `FilesResponse`; retains UI-only `FolderNode` and `CopyUrlPayload`.
- `README.md`: updated management API reference.

---

### Task 1: Define shared contracts, strict paths, and domain errors

**Files:**

- Create: `shared/types/files.ts`
- Modify: `server/utils/file-path.ts`
- Create: `server/utils/file-errors.ts`
- Modify: `test/server/file-path.spec.ts`
- Create: `test/server/file-errors.spec.ts`

**Interfaces:**

- Produces `FileErrorCode`, `ApiSuccess<T>`, `ApiFailure`, `FileOperation`, `BatchOperationResult`, `BatchResult`, `FilesResponse`, and `UploadResult`.
- Produces `parseDirectoryPath(value: unknown): string`, `parseFilePath(value: unknown): string`, `joinFilePath(directory: string, filename: string): string`, and exported limit constants.
- Produces `FileDomainError`, `isFileDomainError(error: unknown)`, and `toApiFailure(error: unknown)`.

- [x] **Step 1: Replace the path tests with strict-path expectations**

Update `test/server/file-path.spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  MAX_FILE_NAME_BYTES,
  MAX_FILE_PATH_BYTES,
  joinFilePath,
  parseDirectoryPath,
  parseFilePath,
  toRelativeFolderName,
} from "../../server/utils/file-path";

describe("file paths", () => {
  it.each([
    [undefined, ""],
    ["", ""],
    ["photos", "photos"],
    ["photos/2026", "photos/2026"],
  ])("accepts canonical directory %j", (input, expected) => {
    expect(parseDirectoryPath(input)).toBe(expected);
  });

  it.each(["/photos", "photos/", "photos//2026", "photos\\2026", ".", "..", "a/../b", "a\u0000b"])(
    "rejects invalid directory %j",
    (input) => expect(() => parseDirectoryPath(input)).toThrow("INVALID_PATH"),
  );

  it("requires a non-empty file path", () => {
    expect(parseFilePath("photos/cat.png")).toBe("photos/cat.png");
    expect(() => parseFilePath("")).toThrow("INVALID_PATH");
  });

  it("enforces UTF-8 byte limits", () => {
    expect(() => parseFilePath("a".repeat(MAX_FILE_NAME_BYTES + 1))).toThrow("INVALID_PATH");
    const oversizedPath = `${"a/".repeat(MAX_FILE_PATH_BYTES / 2)}x`;
    expect(() => parseFilePath(oversizedPath)).toThrow("INVALID_PATH");
  });

  it("joins a validated directory and filename", () => {
    expect(joinFilePath("photos", "cat.png")).toBe("photos/cat.png");
    expect(joinFilePath("", "cat.png")).toBe("cat.png");
  });

  it("converts folded paths to direct child names", () => {
    expect(toRelativeFolderName("photos/2026/", "photos/")).toBe("2026");
    expect(toRelativeFolderName("docs/", "")).toBe("docs");
    expect(toRelativeFolderName("photos/", "photos/")).toBeNull();
  });
});
```

- [x] **Step 2: Add failing domain-error tests**

Create `test/server/file-errors.spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import { FileDomainError, toApiFailure } from "../../server/utils/file-errors";

describe("file errors", () => {
  it("preserves safe domain details", () => {
    expect(
      toApiFailure(
        new FileDomainError("MOVE_PARTIALLY_COMPLETED", {
          source: "a.txt",
          destination: "b.txt",
        }),
      ),
    ).toEqual({
      statusCode: 409,
      body: {
        ok: false,
        error: {
          code: "MOVE_PARTIALLY_COMPLETED",
          message: "目标副本已创建，但源文件删除失败",
          details: { source: "a.txt", destination: "b.txt" },
        },
      },
    });
  });

  it("hides unknown exception details", () => {
    expect(toApiFailure(new Error("bucket secret"))).toEqual({
      statusCode: 500,
      body: {
        ok: false,
        error: { code: "STORAGE_READ_FAILED", message: "存储服务暂时不可用" },
      },
    });
  });
});
```

- [x] **Step 3: Run both tests and confirm red**

Run:

```bash
pnpm test --run test/server/file-path.spec.ts test/server/file-errors.spec.ts
```

Expected: FAIL because the new contracts and error utilities do not exist and the old path utility normalizes invalid paths.

- [x] **Step 4: Create the shared contract**

Create `shared/types/files.ts`:

```ts
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
  { action: "move"; source: string; destination: string } | { action: "delete"; path: string };

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
```

- [x] **Step 5: Implement strict path parsing**

Replace `server/utils/file-path.ts` with:

```ts
import { FileDomainError } from "./file-errors";

export const MAX_BATCH_OPERATIONS = 100;
export const MAX_UPLOAD_FILES = 50;
export const MAX_FILE_NAME_BYTES = 255;
export const MAX_FILE_PATH_BYTES = 1024;

const encoder = new TextEncoder();
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

function assertCanonicalSegments(path: string) {
  if (path.startsWith("/") || path.endsWith("/") || path.includes("//")) {
    throw new FileDomainError("INVALID_PATH");
  }
  if (path.includes("\\") || CONTROL_CHARACTERS.test(path)) {
    throw new FileDomainError("INVALID_PATH");
  }
  const segments = path.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new FileDomainError("INVALID_PATH");
  }
  if (segments.some((segment) => encoder.encode(segment).length > MAX_FILE_NAME_BYTES)) {
    throw new FileDomainError("INVALID_PATH");
  }
  if (encoder.encode(path).length > MAX_FILE_PATH_BYTES) {
    throw new FileDomainError("INVALID_PATH");
  }
}

export function parseDirectoryPath(value: unknown) {
  if (value === undefined || value === "") return "";
  if (typeof value !== "string") throw new FileDomainError("INVALID_PATH");
  assertCanonicalSegments(value);
  return value;
}

export function parseFilePath(value: unknown) {
  if (typeof value !== "string" || !value) throw new FileDomainError("INVALID_PATH");
  assertCanonicalSegments(value);
  return value;
}

export function joinFilePath(directory: string, filename: string) {
  const path = directory ? `${parseDirectoryPath(directory)}/${filename}` : filename;
  return parseFilePath(path);
}

export function toBlobPrefix(directory: string) {
  return directory ? `${parseDirectoryPath(directory)}/` : "";
}

export function toRelativeFolderName(folderPath: string, prefix: string): string | null {
  const relativePath =
    prefix && folderPath.startsWith(prefix) ? folderPath.slice(prefix.length) : folderPath;
  return relativePath.split("/").find(Boolean) ?? null;
}
```

- [x] **Step 6: Implement typed domain errors**

Create `server/utils/file-errors.ts`:

```ts
import type { ApiFailure, FileErrorCode } from "../../shared/types/files";

const ERROR_DEFINITIONS: Record<FileErrorCode, { statusCode: number; message: string }> = {
  INVALID_PATH: { statusCode: 400, message: "文件路径无效" },
  INVALID_FILE: { statusCode: 400, message: "文件无效" },
  SOURCE_NOT_FOUND: { statusCode: 404, message: "源文件不存在" },
  DESTINATION_EXISTS: { statusCode: 409, message: "目标文件已存在" },
  SOURCE_EQUALS_DESTINATION: { statusCode: 400, message: "源路径与目标路径相同" },
  STORAGE_READ_FAILED: { statusCode: 500, message: "存储服务暂时不可用" },
  STORAGE_WRITE_FAILED: { statusCode: 500, message: "文件写入失败" },
  STORAGE_DELETE_FAILED: { statusCode: 500, message: "文件删除失败" },
  MOVE_PARTIALLY_COMPLETED: {
    statusCode: 409,
    message: "目标副本已创建，但源文件删除失败",
  },
  UNAUTHORIZED: { statusCode: 401, message: "请先登录" },
  FORBIDDEN: { statusCode: 403, message: "无权执行此操作" },
};

export class FileDomainError extends Error {
  constructor(
    readonly code: FileErrorCode,
    readonly details?: Record<string, unknown>,
  ) {
    super(code);
  }
}

export function isFileDomainError(error: unknown): error is FileDomainError {
  return error instanceof FileDomainError;
}

export function toApiFailure(error: unknown): { statusCode: number; body: ApiFailure } {
  const domainError = isFileDomainError(error) ? error : new FileDomainError("STORAGE_READ_FAILED");
  const definition = ERROR_DEFINITIONS[domainError.code];
  return {
    statusCode: definition.statusCode,
    body: {
      ok: false,
      error: {
        code: domainError.code,
        message: definition.message,
        ...(domainError.details ? { details: domainError.details } : {}),
      },
    },
  };
}
```

- [x] **Step 7: Run focused checks**

Run:

```bash
pnpm test --run test/server/file-path.spec.ts test/server/file-errors.spec.ts
pnpm exec oxlint shared/types/files.ts server/utils/file-path.ts server/utils/file-errors.ts test/server/file-path.spec.ts test/server/file-errors.spec.ts
pnpm exec oxfmt --check shared/types/files.ts server/utils/file-path.ts server/utils/file-errors.ts test/server/file-path.spec.ts test/server/file-errors.spec.ts
```

Expected: all focused tests pass and both static checks exit 0.

- [x] **Step 8: Commit Task 1**

Stage only the five Task 1 files and invoke `/commit-message en auto`. Expected classification: `refactor(file-domain)`.

---

### Task 2: Isolate NuxtHub Blob behind a repository

**Files:**

- Create: `server/repositories/blob-file-repository.ts`
- Create: `test/server/blob-file-repository.spec.ts`
- Modify: `server/utils/blob-list.ts`
- Modify: `test/server/blob-list.spec.ts`

**Interfaces:**

- Consumes `BlobObject` and `BlobListOptions` from `@nuxthub/core/blob`.
- Produces `FileRepository` with `list`, `read`, `write`, and `remove`.
- Produces `createBlobFileRepository(storage)`.

- [x] **Step 1: Add failing repository tests**

Create `test/server/blob-file-repository.spec.ts` with a typed storage fake and these assertions:

```ts
import type { BlobObject, BlobStorage } from "@nuxthub/core/blob";
import { describe, expect, it, vi } from "vitest";
import { createBlobFileRepository } from "../../server/repositories/blob-file-repository";

const object: BlobObject = {
  pathname: "photos/cat.png",
  contentType: "image/png",
  size: 3,
  httpEtag: '"etag"',
  uploadedAt: new Date("2026-01-01"),
  httpMetadata: {},
  customMetadata: {},
};

describe("blob file repository", () => {
  it("maps list, read, write, and remove to one storage dependency", async () => {
    const storage = {
      list: vi.fn().mockResolvedValue({ blobs: [object], folders: [], hasMore: false }),
      get: vi.fn().mockResolvedValue(new Blob(["cat"], { type: "image/png" })),
      put: vi.fn().mockResolvedValue(object),
      del: vi.fn().mockResolvedValue(undefined),
    } as unknown as BlobStorage;
    const repository = createBlobFileRepository(storage);
    const body = new Blob(["cat"], { type: "image/png" });

    await expect(repository.list({ prefix: "photos/", folded: true })).resolves.toEqual({
      blobs: [object],
      folders: [],
    });
    await expect(repository.read(object.pathname)).resolves.toBeInstanceOf(Blob);
    await expect(repository.write(object.pathname, body, "image/png")).resolves.toBe(object);
    await repository.remove(object.pathname);

    expect(storage.put).toHaveBeenCalledWith(object.pathname, body, {
      contentType: "image/png",
    });
    expect(storage.del).toHaveBeenCalledWith(object.pathname);
  });
});
```

- [x] **Step 2: Run the repository test and confirm red**

Run `pnpm test --run test/server/blob-file-repository.spec.ts`.

Expected: FAIL because the repository module does not exist.

- [x] **Step 3: Implement the repository adapter**

Create `server/repositories/blob-file-repository.ts`:

```ts
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
```

- [x] **Step 4: Keep pagination behavior green through the repository**

Retain `listAllBlobs` cursor checks and run:

```bash
pnpm test --run test/server/blob-list.spec.ts test/server/blob-file-repository.spec.ts
```

Expected: 4 tests pass.

- [x] **Step 5: Run focused static checks**

Run:

```bash
pnpm exec oxlint server/repositories/blob-file-repository.ts server/utils/blob-list.ts test/server/blob-file-repository.spec.ts test/server/blob-list.spec.ts
pnpm exec oxfmt --check server/repositories/blob-file-repository.ts server/utils/blob-list.ts test/server/blob-file-repository.spec.ts test/server/blob-list.spec.ts
```

Expected: both commands exit 0.

- [x] **Step 6: Commit Task 2**

Stage only Task 2 files and invoke `/commit-message en auto`. Expected classification: `refactor(storage)`.

---

### Task 3: Implement reliable upload and single-file services

**Files:**

- Create: `server/services/file-service.ts`
- Create: `test/server/file-service.spec.ts`

**Interfaces:**

- Consumes `FileRepository`, strict path functions, shared operation types, and `FileDomainError`.
- Produces `createFileService(repository)` with `upload`, `move`, `delete`, and `execute`.

- [x] **Step 1: Add failing service tests**

Create `test/server/file-service.spec.ts` with a fresh repository fake per test and cover these exact scenarios:

```ts
import type { BlobObject } from "@nuxthub/core/blob";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FileRepository } from "../../server/repositories/blob-file-repository";
import { createFileService } from "../../server/services/file-service";

const uploaded = (pathname: string): BlobObject => ({
  pathname,
  contentType: "text/plain",
  size: 1,
  httpEtag: '"etag"',
  uploadedAt: new Date("2026-01-01"),
  httpMetadata: {},
  customMetadata: {},
});

describe("file service", () => {
  let repository: FileRepository;

  beforeEach(() => {
    repository = {
      list: vi.fn(),
      read: vi.fn().mockResolvedValue(null),
      write: vi.fn((path: string) => Promise.resolve(uploaded(path))),
      remove: vi.fn().mockResolvedValue(undefined),
    };
  });

  it("preflights every upload target before writing", async () => {
    const service = createFileService(repository);
    await service.upload("docs", [new File(["a"], "a.txt"), new File(["b"], "b.txt")]);
    expect(repository.read).toHaveBeenNthCalledWith(1, "docs/a.txt");
    expect(repository.read).toHaveBeenNthCalledWith(2, "docs/b.txt");
    expect(repository.write).toHaveBeenCalledTimes(2);
  });

  it("rejects duplicate upload names before storage I/O", async () => {
    const service = createFileService(repository);
    await expect(
      service.upload("", [new File(["a"], "same.txt"), new File(["b"], "same.txt")]),
    ).rejects.toMatchObject({ code: "INVALID_FILE" });
    expect(repository.read).not.toHaveBeenCalled();
  });

  it("does not overwrite an existing upload target", async () => {
    vi.mocked(repository.read).mockResolvedValueOnce(new Blob(["existing"]));
    await expect(
      createFileService(repository).upload("", [new File(["new"], "a.txt")]),
    ).rejects.toMatchObject({ code: "DESTINATION_EXISTS" });
    expect(repository.write).not.toHaveBeenCalled();
  });

  it("moves by copying before deleting", async () => {
    vi.mocked(repository.read)
      .mockResolvedValueOnce(new Blob(["source"], { type: "text/plain" }))
      .mockResolvedValueOnce(null);
    await createFileService(repository).move("a.txt", "b.txt");
    expect(repository.write).toHaveBeenCalledWith("b.txt", expect.any(Blob), "text/plain");
    expect(repository.remove).toHaveBeenCalledWith("a.txt");
  });

  it("reports a recoverable partial move when source deletion fails", async () => {
    vi.mocked(repository.read)
      .mockResolvedValueOnce(new Blob(["source"], { type: "text/plain" }))
      .mockResolvedValueOnce(null);
    vi.mocked(repository.remove).mockRejectedValueOnce(new Error("delete failed"));
    await expect(createFileService(repository).move("a.txt", "b.txt")).rejects.toMatchObject({
      code: "MOVE_PARTIALLY_COMPLETED",
      details: { source: "a.txt", destination: "b.txt" },
    });
  });

  it("requires an existing file before deletion", async () => {
    await expect(createFileService(repository).delete("missing.txt")).rejects.toMatchObject({
      code: "SOURCE_NOT_FOUND",
    });
    expect(repository.remove).not.toHaveBeenCalled();
  });
});
```

- [x] **Step 2: Run the service test and confirm red**

Run `pnpm test --run test/server/file-service.spec.ts`.

Expected: FAIL because `createFileService` does not exist.

- [x] **Step 3: Implement the service**

Create `server/services/file-service.ts` with:

```ts
import type { BlobObject } from "@nuxthub/core/blob";
import type { FileOperation } from "../../shared/types/files";
import type { FileRepository } from "../repositories/blob-file-repository";
import { FileDomainError, isFileDomainError } from "../utils/file-errors";
import {
  MAX_UPLOAD_FILES,
  joinFilePath,
  parseDirectoryPath,
  parseFilePath,
} from "../utils/file-path";

export function createFileService(repository: FileRepository) {
  async function upload(directoryValue: unknown, files: File[]): Promise<BlobObject[]> {
    const directory = parseDirectoryPath(directoryValue);
    if (!files.length || files.length > MAX_UPLOAD_FILES) throw new FileDomainError("INVALID_FILE");
    const paths = files.map((file) => joinFilePath(directory, file.name));
    if (new Set(paths).size !== paths.length) throw new FileDomainError("INVALID_FILE");

    for (const path of paths) {
      if (await repository.read(path)) throw new FileDomainError("DESTINATION_EXISTS", { path });
    }

    const uploaded: BlobObject[] = [];
    for (const [index, file] of files.entries()) {
      try {
        uploaded.push(await repository.write(paths[index]!, file, file.type));
      } catch {
        throw new FileDomainError("STORAGE_WRITE_FAILED", { path: paths[index] });
      }
    }
    return uploaded;
  }

  async function move(sourceValue: unknown, destinationValue: unknown): Promise<void> {
    const source = parseFilePath(sourceValue);
    const destination = parseFilePath(destinationValue);
    if (source === destination) throw new FileDomainError("SOURCE_EQUALS_DESTINATION");

    let sourceBody: Blob | null;
    let destinationBody: Blob | null;
    try {
      sourceBody = await repository.read(source);
      destinationBody = await repository.read(destination);
    } catch {
      throw new FileDomainError("STORAGE_READ_FAILED");
    }
    if (!sourceBody) throw new FileDomainError("SOURCE_NOT_FOUND", { source });
    if (destinationBody) throw new FileDomainError("DESTINATION_EXISTS", { destination });

    try {
      await repository.write(destination, sourceBody, sourceBody.type);
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
      if (!(await repository.read(path))) throw new FileDomainError("SOURCE_NOT_FOUND", { path });
      await repository.remove(path);
    } catch (error: unknown) {
      if (isFileDomainError(error)) throw error;
      throw new FileDomainError("STORAGE_DELETE_FAILED", { path });
    }
  }

  async function execute(operation: FileOperation): Promise<void> {
    if (operation.action === "move") return move(operation.source, operation.destination);
    return remove(operation.path);
  }

  return { upload, move, delete: remove, execute };
}
```

- [x] **Step 4: Run the service tests and refine only to satisfy tested behavior**

Run:

```bash
pnpm test --run test/server/file-service.spec.ts
pnpm exec oxlint server/services/file-service.ts test/server/file-service.spec.ts
pnpm exec oxfmt --check server/services/file-service.ts test/server/file-service.spec.ts
```

Expected: all service tests pass and static checks exit 0.

- [x] **Step 5: Commit Task 3**

Stage the service and its test, then invoke `/commit-message en auto`. Expected classification: `refactor(file-operations)`.

---

### Task 4: Add sequential batch execution with per-item recovery data

**Files:**

- Modify: `server/services/file-service.ts`
- Modify: `test/server/file-service.spec.ts`

**Interfaces:**

- Consumes `FileOperation[]`.
- Produces `batch(operations: FileOperation[]): Promise<BatchResult>`.

- [x] **Step 1: Add failing batch tests**

Append to `test/server/file-service.spec.ts`:

```ts
it("executes batch operations sequentially and preserves result order", async () => {
  const service = createFileService(repository);
  const execute = vi.spyOn(service, "execute");
  execute.mockResolvedValueOnce().mockRejectedValueOnce({ code: "DESTINATION_EXISTS" });
  const operations = [
    { action: "delete", path: "a.txt" },
    { action: "move", source: "b.txt", destination: "c.txt" },
  ] as const;

  await expect(service.batch([...operations])).resolves.toMatchObject({
    results: [
      { operation: operations[0], ok: true },
      {
        operation: operations[1],
        ok: false,
        error: { code: "DESTINATION_EXISTS", recoverable: true },
      },
    ],
  });
  expect(execute).toHaveBeenNthCalledWith(1, operations[0]);
  expect(execute).toHaveBeenNthCalledWith(2, operations[1]);
});

it("rejects empty and oversized batches before execution", async () => {
  const service = createFileService(repository);
  await expect(service.batch([])).rejects.toMatchObject({ code: "INVALID_FILE" });
  await expect(
    service.batch(
      Array.from({ length: 101 }, (_, index) => ({ action: "delete", path: `${index}.txt` })),
    ),
  ).rejects.toMatchObject({ code: "INVALID_FILE" });
});
```

- [x] **Step 2: Run the focused test and confirm red**

Run `pnpm test --run test/server/file-service.spec.ts`.

Expected: FAIL because `batch` is not returned by the service.

- [x] **Step 3: Implement sequential batch execution**

Add to `server/services/file-service.ts`:

```ts
import type { BatchOperationResult, BatchResult } from "../../shared/types/files";
import { toApiFailure } from "../utils/file-errors";
import { MAX_BATCH_OPERATIONS } from "../utils/file-path";

const RECOVERABLE_CODES = new Set([
  "INVALID_PATH",
  "SOURCE_NOT_FOUND",
  "DESTINATION_EXISTS",
  "SOURCE_EQUALS_DESTINATION",
  "MOVE_PARTIALLY_COMPLETED",
]);

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
        error: { ...failure, recoverable: RECOVERABLE_CODES.has(failure.code) },
      });
    }
  }
  return { results };
}
```

Return `{ upload, move, delete: remove, execute, batch }`.

- [x] **Step 4: Run focused verification**

Run:

```bash
pnpm test --run test/server/file-service.spec.ts
pnpm exec oxlint server/services/file-service.ts test/server/file-service.spec.ts
pnpm exec oxfmt --check server/services/file-service.ts test/server/file-service.spec.ts
```

Expected: all service tests pass.

- [x] **Step 5: Commit Task 4**

Stage only the two Task 4 files and invoke `/commit-message en auto`. Expected classification: `feat(batch-operations)` because server-side batch execution is a new API capability.

---

### Task 5: Migrate management API handlers to the service contract

**Files:**

- Create: `server/utils/file-api.ts`
- Create: `test/server/file-api.spec.ts`
- Modify: `server/api/files/index.get.ts`
- Modify: `server/api/files/folders.get.ts`
- Modify: `server/api/files/upload.post.ts`
- Create: `server/api/files/operations.post.ts`
- Create: `server/api/files/batch.post.ts`
- Delete: `server/api/files/move.post.ts`
- Delete: `server/api/files/[...pathname].delete.ts`
- Modify: `server/middleware/auth.ts`
- Create: `test/server/file-contracts.spec.ts`

**Interfaces:**

- Produces `success<T>(data: T): ApiSuccess<T>` and `respondFileError(event, error): ApiFailure`.
- All handlers instantiate `createBlobFileRepository(blob)` and `createFileService(repository)`.
- Management routes return shared `ApiResponse<T>` shapes.

- [x] **Step 1: Add failing API helper tests**

Create `test/server/file-api.spec.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { FileDomainError } from "../../server/utils/file-errors";
import { respondFileError, success } from "../../server/utils/file-api";

describe("file API helpers", () => {
  it("wraps successful data", () => {
    expect(success({ value: 1 })).toEqual({ ok: true, data: { value: 1 } });
  });

  it("sets the status and returns a stable failure", () => {
    const event = {};
    vi.stubGlobal("setResponseStatus", vi.fn());
    expect(respondFileError(event, new FileDomainError("SOURCE_NOT_FOUND"))).toMatchObject({
      ok: false,
      error: { code: "SOURCE_NOT_FOUND" },
    });
    expect(setResponseStatus).toHaveBeenCalledWith(event, 404);
  });
});
```

- [x] **Step 2: Add source-level contract tests for route boundaries**

Create `test/server/file-contracts.spec.ts`:

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("file API contracts", () => {
  it("keeps blob access out of management handlers", () => {
    for (const path of [
      "server/api/files/index.get.ts",
      "server/api/files/folders.get.ts",
      "server/api/files/upload.post.ts",
      "server/api/files/operations.post.ts",
      "server/api/files/batch.post.ts",
    ]) {
      expect(read(path)).not.toMatch(/blob\.(list|get|put|del|delete)/);
    }
  });

  it("removes legacy move and pathname-delete handlers", () => {
    expect(() => read("server/api/files/move.post.ts")).toThrow();
    expect(() => read("server/api/files/[...pathname].delete.ts")).toThrow();
  });
});
```

- [x] **Step 3: Run API tests and confirm red**

Run:

```bash
pnpm test --run test/server/file-api.spec.ts test/server/file-contracts.spec.ts
```

Expected: FAIL because the helper and new endpoints do not exist and legacy handlers still exist.

- [x] **Step 4: Implement the response helper**

Create `server/utils/file-api.ts`:

```ts
import type { H3Event } from "h3";
import type { ApiFailure, ApiSuccess } from "../../shared/types/files";
import { toApiFailure } from "./file-errors";

export function success<T>(data: T): ApiSuccess<T> {
  return { ok: true, data };
}

export function respondFileError(event: H3Event, error: unknown): ApiFailure {
  const failure = toApiFailure(error);
  setResponseStatus(event, failure.statusCode);
  return failure.body;
}
```

- [x] **Step 5: Replace management handlers with the listed repository/service calls**

Each handler uses this exact dependency boundary; handler-specific imports for shared types and path helpers are added alongside it:

```ts
import { blob } from "hub:blob";
import { createBlobFileRepository } from "../../repositories/blob-file-repository";
import { createFileService } from "../../services/file-service";

const repository = createBlobFileRepository(blob);
const service = createFileService(repository);

export default defineEventHandler(async (event) => {
  try {
    // parse handler-specific input and call repository/service
    return success(result);
  } catch (error: unknown) {
    return respondFileError(event, error);
  }
});
```

Implement the handler-specific bodies as follows:

```ts
// index.get.ts
const path = parseDirectoryPath(getQuery(event).path);
const prefix = toBlobPrefix(path);
const { blobs, folders: foldedFolders } = await repository.list({ prefix, folded: true });
const folders = [
  ...new Set(
    foldedFolders
      .map((folder) => toRelativeFolderName(folder, prefix))
      .filter((folder): folder is string => folder !== null),
  ),
].toSorted();
const files = blobs
  .toSorted((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
  .map((file) => ({
    pathname: file.pathname,
    contentType: file.contentType ?? "application/octet-stream",
    size: file.size ?? 0,
    uploadedAt: file.uploadedAt.toISOString(),
  }));
return success({ folders, files, currentPath: path });

// folders.get.ts
const { blobs } = await repository.list();
const folders = new Set<string>();
for (const item of blobs) {
  const parts = item.pathname.split("/");
  for (let index = 1; index < parts.length; index += 1)
    folders.add(parts.slice(0, index).join("/"));
}
return success({ folders: [...folders].toSorted() });

// upload.post.ts
const formData = await readFormData(event);
const directory = formData.get("directory");
const files = formData.getAll("files").filter((value): value is File => value instanceof File);
const uploaded = await service.upload(directory, files);
return success({ files: uploaded.map(toClientBlobFile) });

// operations.post.ts
const operation = await readBody<FileOperation>(event);
await service.execute(operation);
return success({ operation });

// batch.post.ts
const body = await readBody<{ operations: FileOperation[] }>(event);
return success(await service.batch(body.operations));
```

Define `toClientBlobFile` in `server/utils/file-api.ts` so listing and upload share the same metadata conversion.

- [x] **Step 6: Remove legacy handlers and stabilize auth failures**

Delete `move.post.ts` and `[...pathname].delete.ts`. Replace `server/middleware/auth.ts` with:

```ts
import type { ApiFailure, FileErrorCode } from "../../shared/types/files";

function authorizationFailure(
  code: Extract<FileErrorCode, "UNAUTHORIZED" | "FORBIDDEN">,
): ApiFailure {
  return {
    ok: false,
    error: {
      code,
      message: code === "UNAUTHORIZED" ? "请先登录" : "无权执行此操作",
    },
  };
}

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname;
  const publicPaths = ["/api/auth/", "/api/blob/", "/_nuxt/", "/favicon.ico"];
  if (publicPaths.some((publicPath) => path.startsWith(publicPath))) return;
  if (!path.startsWith("/api/")) return;

  const session = await getUserSession(event);
  if (!session.user) {
    throw createError({ statusCode: 401, data: authorizationFailure("UNAUTHORIZED") });
  }
  if (session.authorized !== true) {
    throw createError({ statusCode: 403, data: authorizationFailure("FORBIDDEN") });
  }
});
```

- [x] **Step 7: Run server tests and typecheck**

Run:

```bash
pnpm test --run test/server
pnpm typecheck
pnpm exec oxlint server shared/types/files.ts test/server
pnpm exec oxfmt --check server shared/types/files.ts test/server
```

Expected: server tests pass, typecheck passes, and both static checks exit 0.

- [x] **Step 8: Commit Task 5**

Stage only Task 5 files and invoke `/commit-message en auto`. Expected classification: `refactor(file-api)`.

---

### Task 6: Harden Origin parsing and public path validation

**Files:**

- Create: `server/utils/origin-policy.ts`
- Create: `test/server/origin-policy.spec.ts`
- Modify: `server/middleware/cors.ts`
- Modify: `server/routes/api/blob/[...pathname].get.ts`
- Modify: `server/routes/images/[...pathname].get.ts`
- Create: `test/server/public-file-routes.spec.ts`

**Interfaces:**

- Produces `parseAllowedOrigins(value: unknown): string[]`, `getRequestOrigin(origin, referer): string | null`, and `isOriginAllowed(origin, allowedOrigins): boolean`.
- Public routes consume `parseFilePath` before `blob.serve`.

- [x] **Step 1: Add failing pure Origin-policy tests**

Create `test/server/origin-policy.spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  getRequestOrigin,
  isOriginAllowed,
  parseAllowedOrigins,
} from "../../server/utils/origin-policy";

describe("origin policy", () => {
  it("parses configured origins without empty entries", () => {
    expect(parseAllowedOrigins("https://a.example, *.example.com, ")).toEqual([
      "https://a.example",
      "*.example.com",
    ]);
  });

  it("returns null for malformed Origin and Referer values", () => {
    expect(getRequestOrigin("not a url", undefined)).toBeNull();
    expect(getRequestOrigin(undefined, "://bad")).toBeNull();
  });

  it("matches exact origins and wildcard subdomains safely", () => {
    expect(isOriginAllowed("https://app.example.com", ["*.example.com"])).toBe(true);
    expect(isOriginAllowed("https://example.com", ["*.example.com"])).toBe(true);
    expect(isOriginAllowed("https://example.com.evil.test", ["*.example.com"])).toBe(false);
  });
});
```

- [x] **Step 2: Run the Origin test and confirm red**

Run `pnpm test --run test/server/origin-policy.spec.ts`.

Expected: FAIL because the module does not exist.

- [x] **Step 3: Implement the pure Origin policy**

Create `server/utils/origin-policy.ts`:

```ts
export function parseAllowedOrigins(value: unknown) {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getRequestOrigin(origin: string | undefined, referer: string | undefined) {
  const value = origin ?? referer;
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function isOriginAllowed(requestOrigin: string, allowedOrigins: readonly string[]) {
  if (allowedOrigins.includes("*")) return true;
  let url: URL;
  try {
    url = new URL(requestOrigin);
  } catch {
    return false;
  }
  return allowedOrigins.some((allowed) => {
    if (allowed.startsWith("*.")) {
      const domain = allowed.slice(2);
      return url.hostname === domain || url.hostname.endsWith(`.${domain}`);
    }
    try {
      return url.origin === new URL(allowed).origin;
    } catch {
      return false;
    }
  });
}
```

- [x] **Step 4: Refactor CORS middleware and validate public paths**

Replace `server/middleware/cors.ts` with:

```ts
import { getRequestOrigin, isOriginAllowed, parseAllowedOrigins } from "../utils/origin-policy";

export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname;
  if (!path.startsWith("/images/") && !path.startsWith("/api/blob/")) return;

  const cloudflareEnv = event.context.cloudflare?.env as Record<string, string> | undefined;
  const configuredOrigins =
    cloudflareEnv?.NUXT_ALLOWED_ORIGINS || (useRuntimeConfig().allowedOrigins as string);
  const allowedOrigins = parseAllowedOrigins(configuredOrigins);
  if (!allowedOrigins.length) return;

  const requestOrigin = getRequestOrigin(getHeader(event, "origin"), getHeader(event, "referer"));
  if (!requestOrigin || !isOriginAllowed(requestOrigin, allowedOrigins)) {
    throw createError({ statusCode: 403, message: "Forbidden: Origin not allowed" });
  }
});
```

In both public route handlers, replace the raw router parameter with:

```ts
const pathname = parseFilePath(getRouterParam(event, "pathname"));
return blob.serve(event, pathname);
```

Keep the image route Content Security Policy header unchanged.

- [x] **Step 5: Add source-level public-route assertions**

Create `test/server/public-file-routes.spec.ts` and assert both route files import and call `parseFilePath`, while both retain `blob.serve` because public serving remains in the route layer.

- [x] **Step 6: Run focused and server-wide checks**

Run:

```bash
pnpm test --run test/server/origin-policy.spec.ts test/server/public-file-routes.spec.ts
pnpm test --run test/server
pnpm typecheck
```

Expected: all tests and typecheck pass.

- [x] **Step 7: Commit Task 6**

Stage only Task 6 files and invoke `/commit-message en auto`. Expected classification: `fix(origin-policy)` because malformed headers previously caused unexpected server errors.

---

### Task 7: Add the typed frontend API and focused operation composables

**Files:**

- Create: `app/composables/file-manager/useFileApi.ts`
- Create: `app/composables/file-manager/useFileUpload.ts`
- Create: `app/composables/file-manager/useFileOperations.ts`
- Create: `app/composables/file-manager/useBatchFileOperations.ts`
- Create: `test/file-manager/useFileApi.spec.ts`
- Create: `test/file-manager/useFileUpload.spec.ts`
- Create: `test/file-manager/useFileOperations.spec.ts`
- Create: `test/file-manager/useBatchFileOperations.spec.ts`
- Modify: `app/components/file-manager/types.ts`
- Modify: `app/composables/file-manager/useFileSelection.ts`
- Modify: `test/file-manager/useFileSelection.spec.ts`

**Interfaces:**

- `createFileApi(request)` produces `upload`, `execute`, and `batch`; `readFileApiError(error)` safely decodes rejected requests.
- `useFileUpload(dependencies)` produces upload Dialog state and actions.
- `useFileOperations(dependencies)` produces delete/move/rename Dialog state and actions.
- `useBatchFileOperations(dependencies)` produces batch move/delete state and actions.
- `useFileSelection` adds `replaceSelection(paths: Iterable<string>)`.

- [x] **Step 1: Add failing API decoding tests**

Create `test/file-manager/useFileApi.spec.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { createFileApi } from "../../app/composables/file-manager/useFileApi";

describe("file API", () => {
  it("returns successful data", async () => {
    const request = vi
      .fn()
      .mockResolvedValue({ ok: true, data: { operation: { action: "delete", path: "a.txt" } } });
    await expect(
      createFileApi(request).execute({ action: "delete", path: "a.txt" }),
    ).resolves.toMatchObject({
      operation: { action: "delete", path: "a.txt" },
    });
  });

  it("throws the stable API error from a rejected response", async () => {
    const request = vi.fn().mockRejectedValue({
      data: { ok: false, error: { code: "DESTINATION_EXISTS", message: "目标文件已存在" } },
    });
    await expect(
      createFileApi(request).execute({ action: "move", source: "a.txt", destination: "b.txt" }),
    ).rejects.toMatchObject({ code: "DESTINATION_EXISTS" });
  });
});
```

- [x] **Step 2: Add focused workflow tests**

Create one test file per composable with injected fakes. The critical assertions are:

```ts
// useFileUpload.spec.ts
it("retains pending files and directory after upload failure", async () => {
  const api = {
    upload: vi.fn().mockRejectedValue({ code: "STORAGE_WRITE_FAILED", message: "文件写入失败" }),
  };
  const upload = createUpload({
    api,
    currentPath: ref("photos"),
    refreshFiles,
    refreshFolders,
    notify,
    expandPathParents,
  });
  const file = new File(["cat"], "cat.txt");
  upload.handleFilesSelected([file]);
  upload.uploadPathInput.value = "archive";
  await upload.confirmUpload();
  expect(upload.pendingFiles.value).toEqual([file]);
  expect(upload.uploadPathInput.value).toBe("archive");
  expect(upload.showUploadDialog.value).toBe(true);
});

it("warns when refresh fails after a successful upload", async () => {
  const api = { upload: vi.fn().mockResolvedValue({ files: [] }) };
  refreshFiles.mockRejectedValueOnce(new Error("stale"));
  const upload = createUpload({
    api,
    currentPath: ref(""),
    refreshFiles,
    refreshFolders,
    notify,
    expandPathParents,
  });
  upload.handleFilesSelected([new File(["a"], "a.txt")]);
  await upload.confirmUpload();
  expect(notify.warning).toHaveBeenCalledWith("数据刷新失败，当前列表可能不是最新状态");
});
```

```ts
// useFileOperations.spec.ts
it("keeps move state after a partially completed move", async () => {
  api.execute.mockRejectedValueOnce({
    code: "MOVE_PARTIALLY_COMPLETED",
    message: "目标副本已创建，但源文件删除失败",
    details: { source: "photos/a.txt", destination: "archive/a.txt" },
  });
  const operations = createOperations({ api, refreshFiles, refreshFolders, notify, confirmAction });
  operations.openMoveDialog(file);
  operations.moveTargetPath.value = "archive";
  await operations.confirmMove();
  expect(operations.showMoveDialog.value).toBe(true);
  expect(notify.error).toHaveBeenCalledWith(
    "目标副本已创建，但源文件删除失败：photos/a.txt → archive/a.txt",
  );
});
```

```ts
// useBatchFileOperations.spec.ts
it("keeps only failed source paths after partial batch completion", async () => {
  api.batch.mockResolvedValueOnce({
    results: [
      { operation: { action: "delete", path: "a.txt" }, ok: true },
      {
        operation: { action: "delete", path: "b.txt" },
        ok: false,
        error: { code: "STORAGE_DELETE_FAILED", message: "文件删除失败", recoverable: false },
      },
    ],
  });
  const batch = createBatch({
    api,
    selectedFiles: ref(new Set(["a.txt", "b.txt"])),
    replaceSelection,
    refreshFiles,
    refreshFolders,
    notify,
    confirmAction,
  });
  await batch.batchDelete();
  expect(api.batch).toHaveBeenCalledTimes(1);
  expect(replaceSelection).toHaveBeenCalledWith(["b.txt"]);
  expect(notify.warning).toHaveBeenCalledWith("操作完成：1 成功，1 失败");
});
```

Define `createUpload`, `createOperations`, and `createBatch` as small test helpers that call the respective composable with the named fakes. Do not mount Vue components in these tests.

- [x] **Step 3: Run new composable tests and confirm red**

Run:

```bash
pnpm test --run test/file-manager/useFileApi.spec.ts test/file-manager/useFileUpload.spec.ts test/file-manager/useFileOperations.spec.ts test/file-manager/useBatchFileOperations.spec.ts
```

Expected: FAIL because the modules do not exist.

- [x] **Step 4: Implement the typed transport**

Create `app/composables/file-manager/useFileApi.ts`:

```ts
import type {
  ApiResponse,
  BatchResult,
  FileApiError,
  FileOperation,
  UploadResult,
} from "../../../shared/types/files";

type Request = <T>(url: string, options?: Record<string, unknown>) => Promise<ApiResponse<T>>;

function isFileApiError(value: unknown): value is FileApiError {
  return Boolean(
    value &&
    typeof value === "object" &&
    "code" in value &&
    typeof value.code === "string" &&
    "message" in value &&
    typeof value.message === "string",
  );
}

export function readFileApiError(error: unknown): FileApiError {
  if (error && typeof error === "object" && "data" in error) {
    const data = error.data;
    if (
      data &&
      typeof data === "object" &&
      "ok" in data &&
      data.ok === false &&
      "error" in data &&
      isFileApiError(data.error)
    ) {
      return data.error;
    }
  }
  return { code: "STORAGE_READ_FAILED", message: "存储服务暂时不可用" };
}

async function unwrap<T>(request: Promise<ApiResponse<T>>): Promise<T> {
  try {
    const response = await request;
    if (response.ok) return response.data;
    throw response.error;
  } catch (error: unknown) {
    if (isFileApiError(error)) throw error;
    throw readFileApiError(error);
  }
}

export function createFileApi(request: Request) {
  return {
    upload(formData: FormData) {
      return unwrap<UploadResult>(request("/api/files/upload", { method: "POST", body: formData }));
    },
    execute(operation: FileOperation) {
      return unwrap<{ operation: FileOperation }>(
        request("/api/files/operations", { method: "POST", body: operation }),
      );
    },
    batch(operations: FileOperation[]) {
      return unwrap<BatchResult>(
        request("/api/files/batch", { method: "POST", body: { operations } }),
      );
    },
  };
}
```

- [x] **Step 5: Extend selection replacement**

Add to `useFileSelection.ts`:

```ts
function replaceSelection(paths: Iterable<string>) {
  selectedFiles.value = new Set(paths);
}
```

Return it and add a test proving it replaces, rather than appends to, the current selection.

- [x] **Step 6: Implement the three workflow composables**

Use the same dependency shape in all three modules:

```ts
type Refresh = () => Promise<unknown>;
type Notify = {
  success(message: string): void;
  warning(message: string): void;
  error(message: string): void;
};

async function refreshIndexes(refreshFiles: Refresh, refreshFolders: Refresh, notify: Notify) {
  const results = await Promise.allSettled([refreshFiles(), refreshFolders()]);
  if (results.some((result) => result.status === "rejected")) {
    notify.warning("数据刷新失败，当前列表可能不是最新状态");
  }
}
```

`useFileUpload.ts` owns exactly these refs and actions:

```ts
const isUploading = ref(false);
const showUploadDialog = ref(false);
const uploadPathInput = ref("");
const pendingFiles = ref<File[] | null>(null);

function handleFilesSelected(files: FileList | File[]) {
  const incoming = Array.isArray(files) ? files : Array.from(files);
  if (!incoming.length) return;
  if (isUploading.value) return dependencies.notify.warning("正在上传，请稍后再试");
  const merged = mergePendingFiles(
    showUploadDialog.value ? (pendingFiles.value ?? []) : [],
    incoming,
  );
  pendingFiles.value = merged.files;
  if (!showUploadDialog.value) {
    uploadPathInput.value = dependencies.currentPath.value;
    dependencies.expandPathParents(uploadPathInput.value);
    showUploadDialog.value = true;
  }
  if (merged.replacedCount)
    dependencies.notify.warning(`已替换 ${merged.replacedCount} 个同名文件`);
}

async function confirmUpload() {
  if (!pendingFiles.value?.length) return;
  isUploading.value = true;
  const formData = new FormData();
  formData.append("directory", uploadPathInput.value);
  pendingFiles.value.forEach((file) => formData.append("files", file));
  try {
    await dependencies.api.upload(formData);
    dependencies.notify.success("上传成功");
    showUploadDialog.value = false;
    pendingFiles.value = null;
    await refreshIndexes(
      dependencies.refreshFiles,
      dependencies.refreshFolders,
      dependencies.notify,
    );
  } catch (error: unknown) {
    dependencies.notify.error(readFileApiError(error).message);
  } finally {
    isUploading.value = false;
  }
}
```

Retain `cancelUpload`, `handleUploadDialogOpenChange`, and `selectFolder` with the same public names used by `FileManager.vue`. Export `mergePendingFiles` and move all duplicate-file tests from `useFileMutations.spec.ts`.

`useFileOperations.ts` owns delete, move, and rename. Both move and rename call the same endpoint:

```ts
await dependencies.api.execute({
  action: "move",
  source: activeFile.value.pathname,
  destination: buildDestinationPath(targetDirectory.value, targetName),
});
```

On `MOVE_PARTIALLY_COMPLETED`, keep the Dialog open and render the message from safe details:

```ts
const failure = readFileApiError(error);
if (
  failure.code === "MOVE_PARTIALLY_COMPLETED" &&
  typeof failure.details?.source === "string" &&
  typeof failure.details.destination === "string"
) {
  dependencies.notify.error(
    `${failure.message}：${failure.details.source} → ${failure.details.destination}`,
  );
} else {
  dependencies.notify.error(failure.message);
}
```

Only successful operations close their Dialog and call `refreshIndexes`.

`useBatchFileOperations.ts` builds one operations array and calls `api.batch` once:

```ts
const results = await dependencies.api.batch(operations);
const failedPaths = results.results.flatMap((result) => {
  if (result.ok) return [];
  return [result.operation.action === "delete" ? result.operation.path : result.operation.source];
});
const successCount = results.results.length - failedPaths.length;
dependencies.replaceSelection(failedPaths);
if (!failedPaths.length) dependencies.notify.success(`成功处理 ${successCount} 个文件`);
else dependencies.notify.warning(`操作完成：${successCount} 成功，${failedPaths.length} 失败`);
await refreshIndexes(dependencies.refreshFiles, dependencies.refreshFolders, dependencies.notify);
```

If the entire batch request rejects, do not replace selection or close the batch Dialog. After a resolved result, close the Dialog only when at least one operation succeeded; retain it when every result failed.

- [x] **Step 7: Re-export shared UI types**

Update `app/components/file-manager/types.ts`:

```ts
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
```

- [x] **Step 8: Run focused frontend checks**

Run:

```bash
pnpm test --run test/file-manager/useFileApi.spec.ts test/file-manager/useFileUpload.spec.ts test/file-manager/useFileOperations.spec.ts test/file-manager/useBatchFileOperations.spec.ts test/file-manager/useFileSelection.spec.ts
pnpm typecheck
pnpm exec oxlint app/composables/file-manager app/components/file-manager/types.ts test/file-manager
pnpm exec oxfmt --check app/composables/file-manager app/components/file-manager/types.ts test/file-manager
```

Expected: focused tests, typecheck, lint, and formatting checks pass.

- [x] **Step 9: Commit Task 7**

Stage only Task 7 files and invoke `/commit-message en auto`. Expected classification: `refactor(file-manager)`.

---

### Task 8: Integrate the new frontend workflows and canonical directory paths

**Files:**

- Modify: `app/components/FileManager.vue`
- Modify: `app/composables/file-manager/useFolderBrowser.ts`
- Modify: `app/components/file-manager/utils.ts`
- Modify: `test/file-manager/FileManager.spec.ts`
- Modify: `test/file-manager/useFolderBrowser.spec.ts`
- Modify: `test/file-manager/utils.spec.ts`
- Delete: `app/composables/file-manager/useFileMutations.ts`
- Delete: `test/file-manager/useFileMutations.spec.ts`

**Interfaces:**

- `currentPath` becomes canonical (`""`, `"photos"`, `"photos/2026"`) without a trailing slash.
- `FileManager.vue` creates one `fileApi` and composes upload, single-operation, and batch composables.

- [x] **Step 1: Change folder-browser expectations to canonical paths**

Update `test/file-manager/useFolderBrowser.spec.ts` so navigation expects:

```ts
browser.navigateToFolder("photos");
browser.navigateToFolder("2026");
expect(browser.currentPath.value).toBe("photos/2026");
browser.navigateToPath(0);
expect(browser.currentPath.value).toBe("photos");
browser.navigateToPath(-1);
expect(browser.currentPath.value).toBe("");
```

- [x] **Step 2: Update FileManager integration tests for the new API**

Change mocked list data to `{ ok: true, data: FilesResponse }`. Assert:

- listing calls use `query: { path: currentPath }`;
- upload sends multipart with `directory` and `files` fields;
- batch delete sends one `/api/files/batch` request instead of N delete requests;
- partial batch results retain only failed selections;
- move and rename use `/api/files/operations`.

- [x] **Step 3: Run changed tests and confirm red**

Run:

```bash
pnpm test --run test/file-manager/useFolderBrowser.spec.ts test/file-manager/FileManager.spec.ts
```

Expected: FAIL because the implementation still uses trailing slashes and `useFileMutations`.

- [x] **Step 4: Make folder browsing canonical**

Update `useFolderBrowser.ts`:

```ts
const pathParts = computed(() => currentPath.value.split("/").filter(Boolean));

function navigateToFolder(folder: string) {
  currentPath.value = [...pathParts.value, folder].join("/");
}

function navigateToPath(index: number) {
  currentPath.value = index === -1 ? "" : pathParts.value.slice(0, index + 1).join("/");
}
```

Keep folder-tree paths canonical and update helper expectations that previously tolerated or emitted trailing slashes.

- [x] **Step 5: Replace FileManager composition**

In `FileManager.vue`:

- unwrap `useFetch<ApiResponse<FilesResponse>>` with a computed `filesData`;
- query `/api/files` with `{ path: currentPath }`;
- unwrap `/api/files/folders` from `ApiSuccess<{ folders: string[] }>`;
- create `const fileApi = createFileApi((url, options) => $fetch(url, options))`;
- instantiate `useFileUpload`, `useFileOperations`, and `useBatchFileOperations` with the existing toast, confirmation, refresh, current-path, folder-expansion, and selection dependencies;
- pass the same props and events to presentation components so the page layout remains unchanged.

Delete `useFileMutations.ts` after all call sites move.

- [x] **Step 6: Remove obsolete tests and keep workflow coverage focused**

Delete `useFileMutations.spec.ts`. Ensure each moved behavior appears in exactly one focused composable test. Retain only composition and DOM-event coverage in `FileManager.spec.ts`.

- [x] **Step 7: Run the complete frontend suite**

Run:

```bash
pnpm test --run test/file-manager
pnpm typecheck
pnpm exec oxlint app test/file-manager
pnpm exec oxfmt --check app test/file-manager
```

Expected: all frontend tests and static checks pass.

- [x] **Step 8: Commit Task 8**

Stage only Task 8 files and invoke `/commit-message en auto`. Expected classification: `refactor(file-manager)`.

---

### Task 9: Update documentation and run full verification

**Files:**

- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-07-16-file-domain-reliability.md` only to check completed boxes during execution.

**Interfaces:**

- Documents the final management routes and unchanged public routes.

- [x] **Step 1: Update the README API overview**

Replace the old move/delete API list with:

```text
- `GET /api/files?path=<directory>` — 当前目录列表
- `GET /api/files/folders` — 完整文件夹索引
- `POST /api/files/upload` — multipart 文件上传
- `POST /api/files/operations` — 单文件移动、重命名或删除
- `POST /api/files/batch` — 批量移动或删除
- `GET /api/blob/<pathname>` — 公开 Blob 读取（URL 保持不变）
- `GET /images/<pathname>` — 公开图片读取（URL 保持不变）
```

Also state the 50-file upload limit, 100-operation batch limit, and no-overwrite policy.

- [x] **Step 2: Run full verification from a clean index**

Run:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test --run
pnpm build
NITRO_PRESET=cloudflare_module pnpm build
git diff --check
git status --short
```

Expected:

- formatting and lint exit 0;
- typecheck exits 0;
- all Vitest files and tests pass;
- Node and Cloudflare builds exit 0;
- `git diff --check` prints nothing;
- `git status --short` lists only the README and checked plan file before the final task commit.

- [ ] **Step 3: Commit Task 9**

Stage the README and the completed plan checklist, then invoke `/commit-message en auto`. Expected classification: `docs(file-api)` if only documentation/checklist changes remain.

- [ ] **Step 4: Confirm repository state**

Run:

```bash
git status --short
git log --oneline -10
```

Expected: the worktree is clean and the task commits appear in execution order.
