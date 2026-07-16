import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { useFileMutations } from "../../app/composables/file-manager/useFileMutations";
import type { BlobFile } from "../../app/components/file-manager/types";

const file: BlobFile = {
  pathname: "photos/cat.png",
  contentType: "image/png",
  size: 1,
  uploadedAt: "2026-01-01",
};

type Request = (
  url: string,
  options: {
    method: "POST" | "DELETE";
    body?: FormData | { oldPath: string; newPath: string };
  },
) => Promise<unknown>;
type Refresh = () => Promise<unknown>;
type ConfirmAction = (message: string) => boolean;
type Notify = (message: string) => void;
type ClearSelection = () => void;
type ExpandPathParents = (path: string) => void;

describe("useFileMutations", () => {
  const request = vi.fn<Request>();
  const refreshFiles = vi.fn<Refresh>();
  const refreshFolders = vi.fn<Refresh>();
  const confirmAction = vi.fn<ConfirmAction>(() => true);
  const notify = {
    success: vi.fn<Notify>(),
    warning: vi.fn<Notify>(),
    error: vi.fn<Notify>(),
  };
  const selectedFiles = ref(new Set<string>());
  const clearSelection = vi.fn<ClearSelection>(() => selectedFiles.value.clear());
  const expandPathParents = vi.fn<ExpandPathParents>();

  const createMutations = () =>
    useFileMutations({
      request,
      refreshFiles,
      refreshFolders,
      confirmAction,
      notify,
      currentPath: ref("photos/"),
      selectedFiles,
      clearSelection,
      expandPathParents,
    });

  beforeEach(() => {
    vi.clearAllMocks();
    selectedFiles.value.clear();
    request.mockResolvedValue(undefined);
    refreshFiles.mockResolvedValue(undefined);
    refreshFolders.mockResolvedValue(undefined);
  });

  it("uploads files, closes the dialog, and refreshes both indexes", async () => {
    const mutations = createMutations();
    mutations.handleFilesSelected([new File(["cat"], "cat.png")]);
    await mutations.confirmUpload();

    expect(request).toHaveBeenCalledWith("/api/files/upload?prefix=photos%2F", {
      method: "POST",
      body: expect.any(FormData),
    });
    expect(mutations.isUploading.value).toBe(false);
    expect(mutations.showUploadDialog.value).toBe(false);
    expect(refreshFiles).toHaveBeenCalledOnce();
    expect(refreshFolders).toHaveBeenCalledOnce();
  });

  it("appends files to an open upload batch and preserves the chosen path", () => {
    const mutations = createMutations();
    mutations.handleFilesSelected([new File(["a"], "a.txt")]);
    mutations.uploadPathInput.value = "archive/manual";

    mutations.handleFilesSelected([new File(["b"], "b.pdf")]);

    expect(mutations.pendingFiles.value?.map((pendingFile) => pendingFile.name)).toEqual([
      "a.txt",
      "b.pdf",
    ]);
    expect(mutations.uploadPathInput.value).toBe("archive/manual");
    expect(expandPathParents).toHaveBeenCalledOnce();
  });

  it("replaces pending files by name with the most recent File object", () => {
    const first = new File(["old"], "same.txt", { type: "text/plain" });
    const second = new File(["new"], "same.txt", { type: "text/plain" });
    const mutations = createMutations();
    mutations.handleFilesSelected([first]);

    mutations.handleFilesSelected([second]);

    expect(mutations.pendingFiles.value).toEqual([second]);
    expect(notify.warning).toHaveBeenCalledWith("已替换 1 个同名文件");
  });

  it("uses the last duplicate inside one incoming batch", () => {
    const first = new File(["first"], "same.txt");
    const second = new File(["second"], "same.txt");
    const mutations = createMutations();

    mutations.handleFilesSelected([first, second]);

    expect(mutations.pendingFiles.value).toEqual([second]);
    expect(notify.warning).toHaveBeenCalledWith("已替换 1 个同名文件");
  });

  it("rejects new files while uploading without changing the pending batch", async () => {
    let resolveRequest: (() => void) | undefined;
    request.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    const mutations = createMutations();
    const first = new File(["a"], "a.txt");
    mutations.handleFilesSelected([first]);
    const upload = mutations.confirmUpload();

    mutations.handleFilesSelected([new File(["b"], "b.txt")]);
    expect(mutations.pendingFiles.value).toEqual([first]);
    expect(notify.warning).toHaveBeenCalledWith("正在上传，请稍后再试");

    resolveRequest?.();
    await upload;
  });

  it("keeps the upload dialog, files, and path after request failure", async () => {
    request.mockRejectedValueOnce(new Error("failed"));
    const mutations = createMutations();
    const uploadFile = new File(["a"], "a.txt");
    mutations.handleFilesSelected([uploadFile]);
    mutations.uploadPathInput.value = "retry-target";

    await mutations.confirmUpload();

    expect(mutations.showUploadDialog.value).toBe(true);
    expect(mutations.pendingFiles.value).toEqual([uploadFile]);
    expect(mutations.uploadPathInput.value).toBe("retry-target");
    expect(mutations.isUploading.value).toBe(false);
  });

  it("restores move loading and keeps the dialog open on request failure", async () => {
    request.mockRejectedValue({ data: { message: "目标文件已存在" } });
    const mutations = createMutations();
    mutations.openMoveDialog(file);
    mutations.moveTargetPath.value = "archive";
    await mutations.confirmMove();

    expect(mutations.isMoving.value).toBe(false);
    expect(mutations.showMoveDialog.value).toBe(true);
    expect(notify.error).toHaveBeenCalledWith("目标文件已存在");
  });

  it("refreshes both indexes when one refresh rejects", async () => {
    refreshFiles.mockRejectedValue(new Error("refresh failed"));
    const mutations = createMutations();
    await mutations.deleteFile(file.pathname);

    expect(refreshFiles).toHaveBeenCalledOnce();
    expect(refreshFolders).toHaveBeenCalledOnce();
    expect(notify.success).toHaveBeenCalledWith("删除成功");
    expect(notify.error).toHaveBeenCalledWith("刷新文件列表失败");
  });

  it("reports partial batch delete results and always restores loading", async () => {
    selectedFiles.value = new Set(["a.png", "b.png"]);
    request.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("failed"));
    const mutations = createMutations();
    await mutations.batchDelete();

    expect(notify.warning).toHaveBeenCalledWith("删除完成：1 成功，1 失败");
    expect(mutations.isBatchDeleting.value).toBe(false);
    expect(clearSelection).toHaveBeenCalledOnce();
  });

  it("validates rename input before sending a move request", async () => {
    const mutations = createMutations();
    mutations.openRenameDialog(file);
    mutations.newFileName.value = "bad/name.png";
    await mutations.confirmRename();

    expect(request).not.toHaveBeenCalled();
    expect(notify.error).toHaveBeenCalledWith("文件名不能包含 / 或 \\ 字符");
  });

  it("reports partial batch move results and closes the dialog", async () => {
    selectedFiles.value = new Set(["photos/a.png", "photos/b.png"]);
    request.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("failed"));
    const mutations = createMutations();
    mutations.openBatchMoveDialog();
    mutations.batchMoveTargetPath.value = "archive";
    await mutations.confirmBatchMove();

    expect(notify.warning).toHaveBeenCalledWith("移动完成：1 成功，1 失败");
    expect(mutations.isBatchMoving.value).toBe(false);
    expect(mutations.showBatchMoveDialog.value).toBe(false);
    expect(clearSelection).toHaveBeenCalledOnce();
  });

  it("renames through the move endpoint and refreshes both indexes", async () => {
    const mutations = createMutations();
    mutations.openRenameDialog(file);
    mutations.newFileName.value = "dog.png";
    await mutations.confirmRename();

    expect(request).toHaveBeenCalledWith("/api/files/move", {
      method: "POST",
      body: { oldPath: "photos/cat.png", newPath: "photos/dog.png" },
    });
    expect(mutations.showRenameDialog.value).toBe(false);
    expect(refreshFiles).toHaveBeenCalledOnce();
    expect(refreshFolders).toHaveBeenCalledOnce();
  });
});
