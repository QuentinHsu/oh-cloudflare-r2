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
