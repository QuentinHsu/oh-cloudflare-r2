import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BlobFile } from "../../app/components/file-manager/types";
import type { FileApi } from "../../app/composables/file-manager/useFileApi";
import { useFileOperations } from "../../app/composables/file-manager/useFileOperations";
import { createTestTranslate } from "../utils/translate";

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
      expandPathParents,
      notify,
      translate: createTestTranslate(),
    });

  beforeEach(() => {
    vi.clearAllMocks();
    execute.mockResolvedValue({ operation: { action: "delete", path: "a.txt" } });
    refreshFiles.mockResolvedValue(undefined);
    refreshFolders.mockResolvedValue(undefined);
  });

  it("waits for controlled confirmation before deleting", async () => {
    const state = createOperations();

    state.openDeleteDialog("photos/a.txt");

    expect(state.showDeleteDialog.value).toBe(true);
    expect(state.deletePath.value).toBe("photos/a.txt");
    expect(execute).not.toHaveBeenCalled();

    await state.confirmDelete();

    expect(execute).toHaveBeenCalledWith({ action: "delete", path: "photos/a.txt" });
    expect(state.showDeleteDialog.value).toBe(false);
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
