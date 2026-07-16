import { ref, type Ref } from "vue";
import type { BatchResult, FileOperation } from "../../../shared/types/files";
import { buildDestinationPath, getFileName } from "../../components/file-manager/utils";
import { refreshFileIndexes, type FileOperationNotify } from "./fileOperationUtils";
import type { FileApi } from "./useFileApi";
import { readFileApiError } from "./useFileApi";

interface BatchFileOperationsDependencies {
  api: Pick<FileApi, "batch">;
  currentPath: Ref<string>;
  selectedFiles: Ref<Set<string>>;
  replaceSelection: (paths: Iterable<string>) => void;
  refreshFiles: () => Promise<unknown>;
  refreshFolders: () => Promise<unknown>;
  confirmAction: (message: string) => boolean;
  expandPathParents: (path: string) => void;
  notify: FileOperationNotify;
}

function getOperationPath(operation: FileOperation) {
  return operation.action === "delete" ? operation.path : operation.source;
}

export function useBatchFileOperations(dependencies: BatchFileOperationsDependencies) {
  const isBatchMoving = ref(false);
  const isBatchDeleting = ref(false);
  const showBatchMoveDialog = ref(false);
  const batchMoveTargetPath = ref("");

  async function handleResolvedBatch(result: BatchResult) {
    const failedResults = result.results.filter((item) => !item.ok);
    const failedPaths = failedResults.map((item) => getOperationPath(item.operation));
    const successCount = result.results.length - failedResults.length;
    dependencies.replaceSelection(failedPaths);

    if (!failedResults.length) {
      dependencies.notify.success(`成功处理 ${successCount} 个文件`);
    } else {
      dependencies.notify.warning(`操作完成：${successCount} 成功，${failedResults.length} 失败`);
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
      );
    }
    return successCount;
  }

  async function batchDelete() {
    const paths = [...dependencies.selectedFiles.value];
    if (!paths.length) return;
    if (!dependencies.confirmAction(`确定要删除选中的 ${paths.length} 个文件吗？`)) return;

    isBatchDeleting.value = true;
    try {
      const operations: FileOperation[] = paths.map((path) => ({ action: "delete", path }));
      await handleResolvedBatch(await dependencies.api.batch(operations));
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
    showBatchMoveDialog,
    batchMoveTargetPath,
    batchDelete,
    openBatchMoveDialog,
    closeBatchMoveDialog,
    handleBatchMoveDialogOpenChange,
    confirmBatchMove,
  };
}
