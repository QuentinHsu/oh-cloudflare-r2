import { ref, type Ref } from "vue";
import type { BatchResult, FileOperation } from "../../../shared/types/files";
import { buildDestinationPath, getFileName } from "../../components/file-manager/utils";
import {
  refreshFileIndexes,
  type FileOperationNotify,
  type FileOperationTranslate,
} from "./fileOperationUtils";
import type { FileApi } from "./useFileApi";
import { readFileApiError } from "./useFileApi";

interface BatchFileOperationsDependencies {
  api: Pick<FileApi, "batch">;
  currentPath: Ref<string>;
  selectedFiles: Ref<Set<string>>;
  replaceSelection: (paths: Iterable<string>) => void;
  refreshFiles: () => Promise<unknown>;
  refreshFolders: () => Promise<unknown>;
  expandPathParents: (path: string) => void;
  notify: FileOperationNotify;
  translate: FileOperationTranslate;
}

function getOperationPath(operation: FileOperation) {
  return operation.action === "delete" ? operation.path : operation.source;
}

export function useBatchFileOperations(dependencies: BatchFileOperationsDependencies) {
  const isBatchMoving = ref(false);
  const isBatchDeleting = ref(false);
  const showBatchDeleteDialog = ref(false);
  const showBatchMoveDialog = ref(false);
  const batchMoveTargetPath = ref("");

  async function handleResolvedBatch(result: BatchResult) {
    const failedResults = result.results.filter((item) => !item.ok);
    const failedPaths = failedResults.map((item) => getOperationPath(item.operation));
    const successCount = result.results.length - failedResults.length;
    dependencies.replaceSelection(failedPaths);

    if (!failedResults.length) {
      dependencies.notify.success(
        dependencies.translate("notifications.processed", { count: successCount }),
      );
    } else {
      dependencies.notify.warning(
        dependencies.translate("notifications.partial", {
          completed: successCount,
          failed: failedResults.length,
        }),
      );
      for (const item of failedResults) {
        if (
          item.error.code === "MOVE_PARTIALLY_COMPLETED" &&
          typeof item.error.details?.source === "string" &&
          typeof item.error.details.destination === "string"
        ) {
          dependencies.notify.error(
            `${item.error.message}：${item.error.details.source} → ${item.error.details.destination}`,
          );
        }
      }
    }

    const hasStorageChanges =
      successCount > 0 ||
      failedResults.some((item) => item.error.code === "MOVE_PARTIALLY_COMPLETED");
    if (hasStorageChanges) {
      await refreshFileIndexes(
        dependencies.refreshFiles,
        dependencies.refreshFolders,
        dependencies.notify,
        dependencies.translate,
      );
    }
    return successCount;
  }

  function openBatchDeleteDialog() {
    if (!dependencies.selectedFiles.value.size) return;
    showBatchDeleteDialog.value = true;
  }

  function closeBatchDeleteDialog() {
    if (isBatchDeleting.value) return;
    showBatchDeleteDialog.value = false;
  }

  function handleBatchDeleteDialogOpenChange(open: boolean) {
    if (open) showBatchDeleteDialog.value = true;
    else closeBatchDeleteDialog();
  }

  async function confirmBatchDelete() {
    const paths = [...dependencies.selectedFiles.value];
    if (!paths.length) return;

    isBatchDeleting.value = true;
    try {
      const operations: FileOperation[] = paths.map((path) => ({ action: "delete", path }));
      await handleResolvedBatch(await dependencies.api.batch(operations));
      showBatchDeleteDialog.value = false;
    } catch (error: unknown) {
      dependencies.notify.error(readFileApiError(error).message);
    } finally {
      isBatchDeleting.value = false;
    }
  }

  function openBatchMoveDialog() {
    if (!dependencies.selectedFiles.value.size) return;
    batchMoveTargetPath.value = dependencies.currentPath.value;
    dependencies.expandPathParents(batchMoveTargetPath.value);
    showBatchMoveDialog.value = true;
  }

  function closeBatchMoveDialog() {
    showBatchMoveDialog.value = false;
    batchMoveTargetPath.value = "";
  }

  function handleBatchMoveDialogOpenChange(open: boolean) {
    if (open) showBatchMoveDialog.value = true;
    else closeBatchMoveDialog();
  }

  async function confirmBatchMove() {
    const paths = [...dependencies.selectedFiles.value];
    if (!paths.length) return;

    const operations: FileOperation[] = paths.map((source) => ({
      action: "move",
      source,
      destination: buildDestinationPath(batchMoveTargetPath.value, getFileName(source)),
    }));

    isBatchMoving.value = true;
    try {
      const successCount = await handleResolvedBatch(await dependencies.api.batch(operations));
      if (successCount > 0) closeBatchMoveDialog();
    } catch (error: unknown) {
      dependencies.notify.error(readFileApiError(error).message);
    } finally {
      isBatchMoving.value = false;
    }
  }

  return {
    isBatchMoving,
    isBatchDeleting,
    showBatchDeleteDialog,
    showBatchMoveDialog,
    batchMoveTargetPath,
    openBatchDeleteDialog,
    closeBatchDeleteDialog,
    handleBatchDeleteDialogOpenChange,
    confirmBatchDelete,
    openBatchMoveDialog,
    closeBatchMoveDialog,
    handleBatchMoveDialogOpenChange,
    confirmBatchMove,
  };
}
