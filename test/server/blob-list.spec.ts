import type { BlobListOptions } from "@nuxthub/core/blob";
import { describe, expect, it, vi } from "vitest";
import { listAllBlobs } from "../../server/utils/blob-list";

interface TestBlob {
  pathname: string;
}

interface TestPage {
  blobs: TestBlob[];
  folders?: string[];
  hasMore: boolean;
  cursor?: string;
}

type ListBlobs = (options?: BlobListOptions) => Promise<TestPage>;

describe("listAllBlobs", () => {
  it("returns a single page", async () => {
    const list = vi.fn<ListBlobs>().mockResolvedValue({
      blobs: [{ pathname: "a" }],
      folders: ["docs/"],
      hasMore: false,
    });

    await expect(listAllBlobs({ list })).resolves.toEqual({
      blobs: [{ pathname: "a" }],
      folders: ["docs/"],
    });
  });

  it("continues beyond 1000 objects and merges unique folders", async () => {
    const firstPage = Array.from({ length: 1000 }, (_, index) => ({
      pathname: `file-${index}`,
    }));
    const list = vi
      .fn<ListBlobs>()
      .mockResolvedValueOnce({
        blobs: firstPage,
        folders: ["docs/"],
        hasMore: true,
        cursor: "next",
      })
      .mockResolvedValueOnce({
        blobs: [{ pathname: "file-1000" }],
        folders: ["docs/", "images/"],
        hasMore: false,
      });

    const result = await listAllBlobs({ list }, { prefix: "root/", folded: true });

    expect(result.blobs).toHaveLength(1001);
    expect(result.folders).toEqual(["docs/", "images/"]);
    expect(list).toHaveBeenNthCalledWith(2, {
      prefix: "root/",
      folded: true,
      cursor: "next",
    });
  });

  it("rejects a truncated page without a cursor", async () => {
    const list = vi.fn<ListBlobs>().mockResolvedValue({ blobs: [], hasMore: true });
    await expect(listAllBlobs({ list })).rejects.toThrow(
      "Blob listing returned hasMore without a cursor",
    );
  });
});
