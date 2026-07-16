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
      list: vi
        .fn<BlobStorage["list"]>()
        .mockResolvedValue({ blobs: [object], folders: [], hasMore: false }),
      get: vi.fn<BlobStorage["get"]>().mockResolvedValue(new Blob(["cat"], { type: "image/png" })),
      put: vi.fn<BlobStorage["put"]>().mockResolvedValue(object),
      del: vi.fn<BlobStorage["del"]>().mockResolvedValue(undefined),
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
