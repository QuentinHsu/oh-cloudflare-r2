import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BlobFile } from "../../app/components/file-manager/types";
import type { FileApi } from "../../app/composables/file-manager/useFileApi";
import { useFileOperations } from "../../app/composables/file-manager/useFileOperations";

const file: BlobFile = {
  pathname: "photos/a.txt",
  contentType: "text/plain",
  size: 1,
  uploadedAt: "2026-01-01",
};

describe("useFileOperations", () => {
  const execute = vi.fn<FileApi["execute"]>();
  const refreshFiles = vi.fn<() => Promise<unknown>>();
  const refreshFolders = vi.fn<() => Promise<unknown>>();
  const confirmAction = vi.fn<(message: string) => boolean>();
  const expandPathParents = vi.fn<(path: string) => void>();
  const notify = {
    success: vi.fn<(message: string) => void>(),
    warning: vi.fn<(message: string) => void>(),
    error: vi.fn<(message: string) => void>(),
  };

  const createOperations = () =>
    useFileOperations({
      api: { execute },
      refreshFiles,
      refreshFolders,
      confirmAction,
      expandPathParents,
      notify,
    });

  beforeEach(() => {
    vi.clearAllMocks();
    execute.mockResolvedValue({ operation: { action: "delete", path: "a.txt" } });
    refreshFiles.mockResolvedValue(undefined);
    refreshFolders.mockResolvedValue(undefined);
    confirmAction.mockReturnValue(true);
  });

  it("moves a file through the operation API", async () => {
    const state = createOperations();
    state.openMoveDialog(file);
    state.moveTargetPath.value = "archive";
    await state.confirmMove();

    expect(execute).toHaveBeenCalledWith({
      action: "move",
      source: "photos/a.txt",
      destination: "archive/a.txt",
    });
    expect(state.showMoveDialog.value).toBe(false);
  });

  it("keeps move state after a partially completed move", async () => {
    execute.mockRejectedValueOnce({
      code: "MOVE_PARTIALLY_COMPLETED",
      message: "目标副本已创建，但源文件删除失败",
      details: { source: "photos/a.txt", destination: "archive/a.txt" },
    });
    const state = createOperations();
    state.openMoveDialog(file);
    state.moveTargetPath.value = "archive";
    await state.confirmMove();

    expect(state.showMoveDialog.value).toBe(true);
    expect(notify.error).toHaveBeenCalledWith(
      "目标副本已创建，但源文件删除失败：photos/a.txt → archive/a.txt",
    );
    expect(refreshFiles).toHaveBeenCalledOnce();
    expect(refreshFolders).toHaveBeenCalledOnce();
  });

  it("renames through the same move operation", async () => {
    const state = createOperations();
    state.openRenameDialog(file);
    state.newFileName.value = "b.txt";
    await state.confirmRename();

    expect(execute).toHaveBeenCalledWith({
      action: "move",
      source: "photos/a.txt",
      destination: "photos/b.txt",
    });
  });
});
