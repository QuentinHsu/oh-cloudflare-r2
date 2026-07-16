import { describe, expect, it, vi } from "vitest";
import { useFilePreview } from "../../app/composables/file-manager/useFilePreview";
import type { BlobFile } from "../../app/components/file-manager/types";

const file: BlobFile = {
  pathname: "photos/cat.png",
  contentType: "image/png",
  size: 1,
  uploadedAt: "2026-01-01",
};

type WriteClipboard = (text: string) => Promise<void>;
type Notify = (message: string) => void;

describe("useFilePreview", () => {
  it("opens and clears preview state", () => {
    const preview = useFilePreview({
      getOrigin: () => "https://cdn.example.com",
      writeClipboard: vi.fn<WriteClipboard>(),
      notify: { success: vi.fn<Notify>(), error: vi.fn<Notify>() },
    });

    preview.openPreview(file);
    expect(preview.previewFile.value).toEqual(file);
    preview.handlePreviewOpenChange(false);
    expect(preview.previewFile.value).toBeNull();
  });

  it("waits for clipboard success before notifying", async () => {
    let resolveWrite!: () => void;
    const writeClipboard = vi.fn<WriteClipboard>(
      () => new Promise<void>((resolve) => (resolveWrite = resolve)),
    );
    const notify = { success: vi.fn<Notify>(), error: vi.fn<Notify>() };
    const preview = useFilePreview({
      getOrigin: () => "https://cdn.example.com",
      writeClipboard,
      notify,
    });

    const pending = preview.copyUrl(file.pathname, "raw");
    expect(notify.success).not.toHaveBeenCalled();
    resolveWrite();
    await pending;
    expect(notify.success).toHaveBeenCalledWith("链接已复制");
  });

  it("reports clipboard rejection without an unhandled error", async () => {
    const notify = { success: vi.fn<Notify>(), error: vi.fn<Notify>() };
    const preview = useFilePreview({
      getOrigin: () => "https://cdn.example.com",
      writeClipboard: vi.fn<WriteClipboard>().mockRejectedValue(new Error("denied")),
      notify,
    });

    await expect(preview.copyUrl(file.pathname, "markdown")).resolves.toBeUndefined();
    expect(notify.success).not.toHaveBeenCalled();
    expect(notify.error).toHaveBeenCalledWith("复制失败");
  });
});
