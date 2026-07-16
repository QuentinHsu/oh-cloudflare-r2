import { ref } from "vue";
import type { BlobFile } from "../../components/file-manager/types";
import {
  buildDestinationPath,
  getFileName,
  getParentDirectory,
} from "../../components/file-manager/utils";
import { refreshFileIndexes, type FileOperationNotify } from "./fileOperationUtils";
import type { FileApi } from "./useFileApi";
import { readFileApiError } from "./useFileApi";

interface FileOperationsDependencies {
  api: Pick<FileApi, "execute">;
  refreshFiles: () => Promise<unknown>;
  refreshFolders: () => Promise<unknown>;
  confirmAction: (message: string) => boolean;
  expandPathParents: (path: string) => void;
  notify: FileOperationNotify;
}

function formatOperationError(error: unknown) {
  const failure = readFileApiError(error);
  if (
    failure.code === "MOVE_PARTIALLY_COMPLETED" &&
    typeof failure.details?.source === "string" &&
    typeof failure.details.destination === "string"
  ) {
    return `${failure.message}：${failure.details.source} → ${failure.details.destination}`;
  }
  return failure.message;
}

export function useFileOperations(dependencies: FileOperationsDependencies) {
  const showMoveDialog = ref(false);
  const moveFile = ref<BlobFile | null>(null);
  const moveTargetPath = ref("");
  const isMoving = ref(false);
  const showRenameDialog = ref(false);
  const renameFile = ref<BlobFile | null>(null);
  const newFileName = ref("");
  const isRenaming = ref(false);

  async function deleteFile(pathname: string) {
    if (!dependencies.confirmAction("确定要删除这个文件吗？")) return;
    try {
      await dependencies.api.execute({ action: "delete", path: pathname });
      dependencies.notify.success("删除成功");
      await refreshFileIndexes(
        dependencies.refreshFiles,
        dependencies.refreshFolders,
        dependencies.notify,
      );
    } catch (error: unknown) {
      dependencies.notify.error(formatOperationError(error));
    }
  }

  function openMoveDialog(file: BlobFile) {
    moveFile.value = file;
    moveTargetPath.value = getParentDirectory(file.pathname);
    dependencies.expandPathParents(moveTargetPath.value);
    showMoveDialog.value = true;
  }

  function closeMoveDialog() {
    showMoveDialog.value = false;
    moveFile.value = null;
    moveTargetPath.value = "";
  }

  function handleMoveDialogOpenChange(open: boolean) {
    if (open) showMoveDialog.value = true;
    else closeMoveDialog();
  }

  async function confirmMove() {
    if (!moveFile.value) return;
    const filename = getFileName(moveFile.value.pathname);
    if (!filename) {
      dependencies.notify.error("移动失败");
      return;
    }

    isMoving.value = true;
    try {
      await dependencies.api.execute({
        action: "move",
        source: moveFile.value.pathname,
        destination: buildDestinationPath(moveTargetPath.value, filename),
      });
      dependencies.notify.success("移动成功");
      closeMoveDialog();
      await refreshFileIndexes(
        dependencies.refreshFiles,
        dependencies.refreshFolders,
        dependencies.notify,
      );
    } catch (error: unknown) {
      dependencies.notify.error(formatOperationError(error));
      if (readFileApiError(error).code === "MOVE_PARTIALLY_COMPLETED") {
        await refreshFileIndexes(
          dependencies.refreshFiles,
          dependencies.refreshFolders,
          dependencies.notify,
        );
      }
    } finally {
      isMoving.value = false;
    }
  }

  function openRenameDialog(file: BlobFile) {
    renameFile.value = file;
    newFileName.value = getFileName(file.pathname);
    showRenameDialog.value = true;
  }

  function closeRenameDialog() {
    showRenameDialog.value = false;
    renameFile.value = null;
    newFileName.value = "";
  }

  function handleRenameDialogOpenChange(open: boolean) {
    if (open) showRenameDialog.value = true;
    else closeRenameDialog();
  }

  async function confirmRename() {
    if (!renameFile.value) return;
    const trimmedName = newFileName.value.trim();
    if (!trimmedName) {
      dependencies.notify.error("文件名不能为空");
      return;
    }
    if (trimmedName === getFileName(renameFile.value.pathname)) {
      dependencies.notify.error("文件名未改变");
      return;
    }
    if (/[/\\]/.test(trimmedName)) {
      dependencies.notify.error("文件名不能包含 / 或 \\ 字符");
      return;
    }

    isRenaming.value = true;
    try {
      await dependencies.api.execute({
        action: "move",
        source: renameFile.value.pathname,
        destination: buildDestinationPath(
          getParentDirectory(renameFile.value.pathname),
          trimmedName,
        ),
      });
      dependencies.notify.success("重命名成功");
      closeRenameDialog();
      await refreshFileIndexes(
        dependencies.refreshFiles,
        dependencies.refreshFolders,
        dependencies.notify,
      );
    } catch (error: unknown) {
      dependencies.notify.error(formatOperationError(error));
      if (readFileApiError(error).code === "MOVE_PARTIALLY_COMPLETED") {
        await refreshFileIndexes(
          dependencies.refreshFiles,
          dependencies.refreshFolders,
          dependencies.notify,
        );
      }
    } finally {
      isRenaming.value = false;
    }
  }

  return {
    showMoveDialog,
    moveFile,
    moveTargetPath,
    isMoving,
    showRenameDialog,
    renameFile,
    newFileName,
    isRenaming,
    deleteFile,
    openMoveDialog,
    closeMoveDialog,
    handleMoveDialogOpenChange,
    confirmMove,
    openRenameDialog,
    closeRenameDialog,
    handleRenameDialogOpenChange,
    confirmRename,
  };
}
