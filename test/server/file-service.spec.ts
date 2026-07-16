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
      list: vi.fn<FileRepository["list"]>(),
      read: vi.fn<FileRepository["read"]>().mockResolvedValue(null),
      write: vi
        .fn<FileRepository["write"]>()
        .mockImplementation((path) => Promise.resolve(uploaded(path))),
      remove: vi.fn<FileRepository["remove"]>().mockResolvedValue(undefined),
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
    expect(vi.mocked(repository.write).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(repository.remove).mock.invocationCallOrder[0]!,
    );
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

  it("rejects an existing move destination without writing", async () => {
    vi.mocked(repository.read)
      .mockResolvedValueOnce(new Blob(["source"]))
      .mockResolvedValueOnce(new Blob(["destination"]));

    await expect(createFileService(repository).move("a.txt", "b.txt")).rejects.toMatchObject({
      code: "DESTINATION_EXISTS",
    });
    expect(repository.write).not.toHaveBeenCalled();
  });

  it("requires an existing file before deletion", async () => {
    await expect(createFileService(repository).delete("missing.txt")).rejects.toMatchObject({
      code: "SOURCE_NOT_FOUND",
    });
    expect(repository.remove).not.toHaveBeenCalled();
  });

  it("executes batch operations sequentially and preserves partial results", async () => {
    vi.mocked(repository.read)
      .mockResolvedValueOnce(new Blob(["a"]))
      .mockResolvedValueOnce(new Blob(["b"]));
    vi.mocked(repository.remove)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("delete failed"));
    const operations = [
      { action: "delete", path: "a.txt" },
      { action: "delete", path: "b.txt" },
    ] as const;

    await expect(createFileService(repository).batch([...operations])).resolves.toEqual({
      results: [
        { operation: operations[0], ok: true },
        {
          operation: operations[1],
          ok: false,
          error: {
            code: "STORAGE_DELETE_FAILED",
            message: "文件删除失败",
            details: { path: "b.txt" },
            recoverable: false,
          },
        },
      ],
    });
    expect(repository.remove).toHaveBeenNthCalledWith(1, "a.txt");
    expect(repository.remove).toHaveBeenNthCalledWith(2, "b.txt");
  });

  it("marks destination conflicts as recoverable batch failures", async () => {
    vi.mocked(repository.read)
      .mockResolvedValueOnce(new Blob(["source"]))
      .mockResolvedValueOnce(new Blob(["destination"]));
    const operation = { action: "move", source: "a.txt", destination: "b.txt" } as const;

    await expect(createFileService(repository).batch([operation])).resolves.toMatchObject({
      results: [
        {
          operation,
          ok: false,
          error: { code: "DESTINATION_EXISTS", recoverable: true },
        },
      ],
    });
  });

  it("rejects empty and oversized batches before storage I/O", async () => {
    const service = createFileService(repository);

    await expect(service.batch([])).rejects.toMatchObject({ code: "INVALID_FILE" });
    await expect(
      service.batch(
        Array.from({ length: 101 }, (_, index) => ({
          action: "delete" as const,
          path: `${index}.txt`,
        })),
      ),
    ).rejects.toMatchObject({ code: "INVALID_FILE" });
    expect(repository.read).not.toHaveBeenCalled();
  });
});
