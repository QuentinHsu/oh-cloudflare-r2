import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import type { FileApi } from "../../app/composables/file-manager/useFileApi";
import { useBatchFileOperations } from "../../app/composables/file-manager/useBatchFileOperations";
import { createTestTranslate } from "../utils/translate";

describe("useBatchFileOperations", () => {
  const batch = vi.fn<FileApi["batch"]>();
  const refreshFiles = vi.fn<() => Promise<unknown>>();
  const refreshFolders = vi.fn<() => Promise<unknown>>();
  const replaceSelection = vi.fn<(paths: Iterable<string>) => void>();
  const expandPathParents = vi.fn<(path: string) => void>();
  const notify = {
    success: vi.fn<(message: string) => void>(),
    warning: vi.fn<(message: string) => void>(),
    error: vi.fn<(message: string) => void>(),
  };
  const selectedFiles = ref(new Set(["a.txt", "b.txt"]));

  const createBatch = () =>
    useBatchFileOperations({
      api: { batch },
      currentPath: ref(""),
      selectedFiles,
      replaceSelection,
      refreshFiles,
      refreshFolders,
      expandPathParents,
      notify,
      translate: createTestTranslate(),
    });

  beforeEach(() => {
    vi.clearAllMocks();
    selectedFiles.value = new Set(["a.txt", "b.txt"]);
    refreshFiles.mockResolvedValue(undefined);
    refreshFolders.mockResolvedValue(undefined);
  });

  it("waits for controlled confirmation before batch deletion", async () => {
    batch.mockResolvedValueOnce({
      results: [
        { operation: { action: "delete", path: "a.txt" }, ok: true },
        { operation: { action: "delete", path: "b.txt" }, ok: true },
      ],
    });
    const state = createBatch();

    state.openBatchDeleteDialog();

    expect(state.showBatchDeleteDialog.value).toBe(true);
    expect(batch).not.toHaveBeenCalled();

    await state.confirmBatchDelete();

    expect(batch).toHaveBeenCalledOnce();
    expect(state.showBatchDeleteDialog.value).toBe(false);
  });

  it("keeps only failed paths after partial batch deletion", async () => {
    batch.mockResolvedValueOnce({
      results: [
        { operation: { action: "delete", path: "a.txt" }, ok: true },
        {
          operation: { action: "delete", path: "b.txt" },
          ok: false,
          error: {
            code: "STORAGE_DELETE_FAILED",
            message: "文件删除失败",
            recoverable: false,
          },
        },
      ],
    });
    const state = createBatch();
    state.openBatchDeleteDialog();
    await state.confirmBatchDelete();

    expect(batch).toHaveBeenCalledTimes(1);
    expect(replaceSelection).toHaveBeenCalledWith(["b.txt"]);
    expect(notify.warning).toHaveBeenCalledWith("操作完成：1 成功，1 失败");
  });

  it("keeps the move dialog and selection after a rejected batch request", async () => {
    batch.mockRejectedValueOnce({
      code: "STORAGE_READ_FAILED",
      message: "存储服务暂时不可用",
    });
    const state = createBatch();
    state.openBatchMoveDialog();
    state.batchMoveTargetPath.value = "archive";
    await state.confirmBatchMove();

    expect(state.showBatchMoveDialog.value).toBe(true);
    expect(replaceSelection).not.toHaveBeenCalled();
    expect(notify.error).toHaveBeenCalledWith("存储服务暂时不可用");
  });

  it("refreshes indexes after a partially completed batch move", async () => {
    batch.mockResolvedValueOnce({
      results: [
        {
          operation: { action: "move", source: "a.txt", destination: "archive/a.txt" },
          ok: false,
          error: {
            code: "MOVE_PARTIALLY_COMPLETED",
            message: "目标副本已创建，但源文件删除失败",
            details: { source: "a.txt", destination: "archive/a.txt" },
            recoverable: true,
          },
        },
        {
          operation: { action: "move", source: "b.txt", destination: "archive/b.txt" },
          ok: false,
          error: {
            code: "DESTINATION_EXISTS",
            message: "目标文件已存在",
            recoverable: true,
          },
        },
      ],
    });
    const state = createBatch();
    state.openBatchMoveDialog();
    state.batchMoveTargetPath.value = "archive";
    await state.confirmBatchMove();

    expect(state.showBatchMoveDialog.value).toBe(true);
    expect(refreshFiles).toHaveBeenCalledOnce();
    expect(refreshFolders).toHaveBeenCalledOnce();
  });
});
