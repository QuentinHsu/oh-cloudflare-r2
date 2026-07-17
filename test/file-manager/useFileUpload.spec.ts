import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import type { FileApi } from "../../app/composables/file-manager/useFileApi";
import { useFileUpload } from "../../app/composables/file-manager/useFileUpload";
import { createTestTranslate } from "../utils/translate";

describe("useFileUpload", () => {
  const upload = vi.fn<FileApi["upload"]>();
  const refreshFiles = vi.fn<() => Promise<unknown>>();
  const refreshFolders = vi.fn<() => Promise<unknown>>();
  const expandPathParents = vi.fn<(path: string) => void>();
  const notify = {
    success: vi.fn<(message: string) => void>(),
    warning: vi.fn<(message: string) => void>(),
    error: vi.fn<(message: string) => void>(),
  };

  const createUpload = () =>
    useFileUpload({
      api: { upload },
      currentPath: ref("photos"),
      refreshFiles,
      refreshFolders,
      expandPathParents,
      notify,
      translate: createTestTranslate(),
    });

  beforeEach(() => {
    vi.clearAllMocks();
    upload.mockResolvedValue({ files: [] });
    refreshFiles.mockResolvedValue(undefined);
    refreshFolders.mockResolvedValue(undefined);
  });

  it("uploads multipart data and clears state after success", async () => {
    const state = createUpload();
    state.handleFilesSelected([new File(["cat"], "cat.txt")]);
    await state.confirmUpload();

    const formData = upload.mock.calls[0]?.[0];
    expect(formData?.get("directory")).toBe("photos");
    expect(formData?.getAll("files")).toHaveLength(1);
    expect(state.showUploadDialog.value).toBe(false);
    expect(state.pendingFiles.value).toBeNull();
    expect(refreshFiles).toHaveBeenCalledOnce();
    expect(refreshFolders).toHaveBeenCalledOnce();
  });

  it("retains pending files and directory after upload failure", async () => {
    upload.mockRejectedValueOnce({ code: "STORAGE_WRITE_FAILED", message: "文件写入失败" });
    const state = createUpload();
    const file = new File(["cat"], "cat.txt");
    state.handleFilesSelected([file]);
    state.uploadPathInput.value = "archive";
    await state.confirmUpload();

    expect(state.pendingFiles.value).toEqual([file]);
    expect(state.uploadPathInput.value).toBe("archive");
    expect(state.showUploadDialog.value).toBe(true);
    expect(notify.error).toHaveBeenCalledWith("文件写入失败");
  });

  it("warns when refresh fails after a successful upload", async () => {
    refreshFiles.mockRejectedValueOnce(new Error("stale"));
    const state = createUpload();
    state.handleFilesSelected([new File(["a"], "a.txt")]);
    await state.confirmUpload();

    expect(notify.warning).toHaveBeenCalledWith("数据刷新失败，当前列表可能不是最新状态");
  });

  it("appends new files while preserving the selected directory", () => {
    const state = createUpload();
    state.handleFilesSelected([new File(["a"], "a.txt")]);
    state.uploadPathInput.value = "archive";
    state.handleFilesSelected([new File(["b"], "b.txt")]);

    expect(state.pendingFiles.value?.map((file) => file.name)).toEqual(["a.txt", "b.txt"]);
    expect(state.uploadPathInput.value).toBe("archive");
  });

  it("replaces pending files with the latest same-name object", () => {
    const first = new File(["old"], "same.txt");
    const second = new File(["new"], "same.txt");
    const state = createUpload();
    state.handleFilesSelected([first]);
    state.handleFilesSelected([second]);

    expect(state.pendingFiles.value).toEqual([second]);
    expect(notify.warning).toHaveBeenCalledWith("已替换 1 个同名文件");
  });
});
