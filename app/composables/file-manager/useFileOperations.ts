import { ref } from "vue";
import type { BlobFile } from "../../components/file-manager/types";
import {
  buildDestinationPath,
  getFileName,
  getParentDirectory,
} from "../../components/file-manager/utils";
import {
  refreshFileIndexes,
  type FileOperationNotify,
  type FileOperationTranslate,
} from "./fileOperationUtils";
import type { FileApi } from "./useFileApi";
import { readFileApiError } from "./useFileApi";

interface FileOperationsDependencies {
  api: Pick<FileApi, "execute">;
  refreshFiles: () => Promise<unknown>;
  refreshFolders: () => Promise<unknown>;
  expandPathParents: (path: string) => void;
  notify: FileOperationNotify;
  translate: FileOperationTranslate;
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
  const showDeleteDialog = ref(false);
  const deletePath = ref("");
  const isDeleting = ref(false);

  function openDeleteDialog(pathname: string) {
    deletePath.value = pathname;
    showDeleteDialog.value = true;
  }

  function closeDeleteDialog() {
    if (isDeleting.value) return;
    showDeleteDialog.value = false;
    deletePath.value = "";
  }

  function handleDeleteDialogOpenChange(open: boolean) {
    if (open) showDeleteDialog.value = true;
    else closeDeleteDialog();
  }

  async function confirmDelete() {
    if (!deletePath.value) return;
    const pathname = deletePath.value;
    isDeleting.value = true;
    try {
      await dependencies.api.execute({ action: "delete", path: pathname });
      dependencies.notify.success(dependencies.translate("notifications.deleteSuccess"));
      await refreshFileIndexes(
        dependencies.refreshFiles,
        dependencies.refreshFolders,
        dependencies.notify,
        dependencies.translate,
      );
      showDeleteDialog.value = false;
      deletePath.value = "";
    } catch (error: unknown) {
      dependencies.notify.error(formatOperationError(error));
    } finally {
      isDeleting.value = false;
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
      dependencies.notify.error(dependencies.translate("notifications.moveFailed"));
      return;
    }

    isMoving.value = true;
    try {
      await dependencies.api.execute({
        action: "move",
        source: moveFile.value.pathname,
        destination: buildDestinationPath(moveTargetPath.value, filename),
      });
      dependencies.notify.success(dependencies.translate("notifications.moveSuccess"));
      closeMoveDialog();
      await refreshFileIndexes(
        dependencies.refreshFiles,
        dependencies.refreshFolders,
        dependencies.notify,
        dependencies.translate,
      );
    } catch (error: unknown) {
      dependencies.notify.error(formatOperationError(error));
      if (readFileApiError(error).code === "MOVE_PARTIALLY_COMPLETED") {
        await refreshFileIndexes(
          dependencies.refreshFiles,
          dependencies.refreshFolders,
          dependencies.notify,
          dependencies.translate,
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
      dependencies.notify.error(dependencies.translate("notifications.nameRequired"));
      return;
    }
    if (trimmedName === getFileName(renameFile.value.pathname)) {
      dependencies.notify.error(dependencies.translate("notifications.nameUnchanged"));
      return;
    }
    if (/[/\\]/.test(trimmedName)) {
      dependencies.notify.error(dependencies.translate("notifications.nameInvalid"));
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
      dependencies.notify.success(dependencies.translate("notifications.renameSuccess"));
      closeRenameDialog();
      await refreshFileIndexes(
        dependencies.refreshFiles,
        dependencies.refreshFolders,
        dependencies.notify,
        dependencies.translate,
      );
    } catch (error: unknown) {
      dependencies.notify.error(formatOperationError(error));
      if (readFileApiError(error).code === "MOVE_PARTIALLY_COMPLETED") {
        await refreshFileIndexes(
          dependencies.refreshFiles,
          dependencies.refreshFolders,
          dependencies.notify,
          dependencies.translate,
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
    showDeleteDialog,
    deletePath,
    isDeleting,
    openDeleteDialog,
    closeDeleteDialog,
    handleDeleteDialogOpenChange,
    confirmDelete,
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
