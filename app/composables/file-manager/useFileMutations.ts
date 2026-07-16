import { computed, ref, type Ref } from "vue";
import type { BlobFile } from "../../components/file-manager/types";
import {
  buildDestinationPath,
  getFileName,
  getParentDirectory,
  getRequestErrorMessage,
  normalizeDirectoryPath,
} from "../../components/file-manager/utils";

interface RequestOptions {
  method: "POST" | "DELETE";
  body?: FormData | { oldPath: string; newPath: string };
}

interface FileMutationDependencies {
  request: (url: string, options: RequestOptions) => Promise<unknown>;
  refreshFiles: () => Promise<unknown>;
  refreshFolders: () => Promise<unknown>;
  confirmAction: (message: string) => boolean;
  notify: {
    success: (message: string) => void;
    warning: (message: string) => void;
    error: (message: string) => void;
  };
  currentPath: Ref<string>;
  selectedFiles: Ref<Set<string>>;
  clearSelection: () => void;
  expandPathParents: (path: string) => void;
}

type MergeFilesResult = { files: File[]; replacedCount: number };

function mergePendingFiles(current: readonly File[], incoming: readonly File[]): MergeFilesResult {
  const files = [...current];
  const indexByName = new Map(files.map((file, index) => [file.name, index]));
  let replacedCount = 0;

  for (const file of incoming) {
    const existingIndex = indexByName.get(file.name);
    if (existingIndex === undefined) {
      indexByName.set(file.name, files.length);
      files.push(file);
      continue;
    }
    files[existingIndex] = file;
    replacedCount += 1;
  }

  return { files, replacedCount };
}

export function useFileMutations(dependencies: FileMutationDependencies) {
  const isUploading = ref(false);
  const showUploadDialog = ref(false);
  const uploadPathInput = ref("");
  const pendingFiles = ref<File[] | null>(null);
  const showMoveDialog = ref(false);
  const moveFile = ref<BlobFile | null>(null);
  const moveTargetPath = ref("");
  const isMoving = ref(false);
  const isBatchMoving = ref(false);
  const isBatchDeleting = ref(false);
  const showBatchMoveDialog = ref(false);
  const batchMoveTargetPath = ref("");
  const showRenameDialog = ref(false);
  const renameFile = ref<BlobFile | null>(null);
  const newFileName = ref("");
  const isRenaming = ref(false);
  const finalUploadPath = computed(() => {
    const path = normalizeDirectoryPath(uploadPathInput.value);
    return path ? `${path}/` : "";
  });

  async function refreshIndexes() {
    const results = await Promise.allSettled([
      Promise.resolve().then(() => dependencies.refreshFiles()),
      Promise.resolve().then(() => dependencies.refreshFolders()),
    ]);
    if (results.some((result) => result.status === "rejected")) {
      dependencies.notify.error("刷新文件列表失败");
    }
  }

  function handleFilesSelected(files: FileList | File[]) {
    const incomingFiles = Array.isArray(files) ? files : Array.from(files);
    if (!incomingFiles.length) return;
    if (isUploading.value) {
      dependencies.notify.warning("正在上传，请稍后再试");
      return;
    }

    const isAppending = showUploadDialog.value;
    const currentFiles = isAppending ? (pendingFiles.value ?? []) : [];
    const merged = mergePendingFiles(currentFiles, incomingFiles);
    pendingFiles.value = merged.files;

    if (!isAppending) {
      uploadPathInput.value = normalizeDirectoryPath(dependencies.currentPath.value);
      dependencies.expandPathParents(uploadPathInput.value);
      showUploadDialog.value = true;
    }
    if (merged.replacedCount > 0) {
      dependencies.notify.warning(`已替换 ${merged.replacedCount} 个同名文件`);
    }
  }

  function cancelUpload() {
    showUploadDialog.value = false;
    pendingFiles.value = null;
  }

  function handleUploadDialogOpenChange(open: boolean) {
    if (open) showUploadDialog.value = true;
    else cancelUpload();
  }

  function selectFolder(path: string) {
    uploadPathInput.value = path;
  }

  async function confirmUpload() {
    if (!pendingFiles.value?.length) return;
    isUploading.value = true;
    const formData = new FormData();
    pendingFiles.value.forEach((file) => formData.append("files", file));
    try {
      await dependencies.request(
        `/api/files/upload?prefix=${encodeURIComponent(finalUploadPath.value)}`,
        { method: "POST", body: formData },
      );
      dependencies.notify.success("上传成功");
      cancelUpload();
      await refreshIndexes();
    } catch {
      dependencies.notify.error("上传失败");
    } finally {
      isUploading.value = false;
    }
  }

  async function deleteFile(pathname: string) {
    if (!dependencies.confirmAction("确定要删除这个文件吗？")) return;
    try {
      await dependencies.request(`/api/files/${encodeURIComponent(pathname)}`, {
        method: "DELETE",
      });
      dependencies.notify.success("删除成功");
      await refreshIndexes();
    } catch {
      dependencies.notify.error("删除失败");
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
    const newPath = buildDestinationPath(moveTargetPath.value, filename);
    if (!filename) {
      dependencies.notify.error("移动失败");
      return;
    }
    if (newPath === moveFile.value.pathname) {
      dependencies.notify.error("目标路径与原路径相同");
      return;
    }

    isMoving.value = true;
    try {
      await dependencies.request("/api/files/move", {
        method: "POST",
        body: { oldPath: moveFile.value.pathname, newPath },
      });
      dependencies.notify.success("移动成功");
      closeMoveDialog();
      await refreshIndexes();
    } catch (error: unknown) {
      dependencies.notify.error(getRequestErrorMessage(error) ?? "移动失败");
    } finally {
      isMoving.value = false;
    }
  }

  async function batchDelete() {
    if (!dependencies.selectedFiles.value.size) return;
    if (
      !dependencies.confirmAction(
        `确定要删除选中的 ${dependencies.selectedFiles.value.size} 个文件吗？`,
      )
    ) {
      return;
    }

    isBatchDeleting.value = true;
    const paths = [...dependencies.selectedFiles.value];
    let successCount = 0;
    let failCount = 0;
    try {
      for (const pathname of paths) {
        try {
          await dependencies.request(`/api/files/${encodeURIComponent(pathname)}`, {
            method: "DELETE",
          });
          successCount += 1;
        } catch {
          failCount += 1;
        }
      }

      if (failCount === 0) dependencies.notify.success(`成功删除 ${successCount} 个文件`);
      else dependencies.notify.warning(`删除完成：${successCount} 成功，${failCount} 失败`);
      dependencies.clearSelection();
      await refreshIndexes();
    } finally {
      isBatchDeleting.value = false;
    }
  }

  function openBatchMoveDialog() {
    if (!dependencies.selectedFiles.value.size) return;
    batchMoveTargetPath.value = normalizeDirectoryPath(dependencies.currentPath.value);
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
    if (!dependencies.selectedFiles.value.size) return;
    isBatchMoving.value = true;
    const paths = [...dependencies.selectedFiles.value];
    let successCount = 0;
    let failCount = 0;
    try {
      for (const oldPath of paths) {
        const filename = getFileName(oldPath);
        const newPath = buildDestinationPath(batchMoveTargetPath.value, filename);
        if (!filename) {
          failCount += 1;
          continue;
        }
        if (newPath === oldPath) continue;

        try {
          await dependencies.request("/api/files/move", {
            method: "POST",
            body: { oldPath, newPath },
          });
          successCount += 1;
        } catch {
          failCount += 1;
        }
      }

      if (failCount === 0) dependencies.notify.success(`成功移动 ${successCount} 个文件`);
      else dependencies.notify.warning(`移动完成：${successCount} 成功，${failCount} 失败`);
      dependencies.clearSelection();
      closeBatchMoveDialog();
      await refreshIndexes();
    } finally {
      isBatchMoving.value = false;
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

    const newPath = buildDestinationPath(
      getParentDirectory(renameFile.value.pathname),
      trimmedName,
    );
    isRenaming.value = true;
    try {
      await dependencies.request("/api/files/move", {
        method: "POST",
        body: { oldPath: renameFile.value.pathname, newPath },
      });
      dependencies.notify.success("重命名成功");
      closeRenameDialog();
      await refreshIndexes();
    } catch (error: unknown) {
      dependencies.notify.error(getRequestErrorMessage(error) ?? "重命名失败");
    } finally {
      isRenaming.value = false;
    }
  }

  return {
    isUploading,
    showUploadDialog,
    uploadPathInput,
    pendingFiles,
    showMoveDialog,
    moveFile,
    moveTargetPath,
    isMoving,
    isBatchMoving,
    isBatchDeleting,
    showBatchMoveDialog,
    batchMoveTargetPath,
    showRenameDialog,
    renameFile,
    newFileName,
    isRenaming,
    handleFilesSelected,
    confirmUpload,
    cancelUpload,
    handleUploadDialogOpenChange,
    selectFolder,
    deleteFile,
    openMoveDialog,
    closeMoveDialog,
    handleMoveDialogOpenChange,
    confirmMove,
    batchDelete,
    openBatchMoveDialog,
    closeBatchMoveDialog,
    handleBatchMoveDialogOpenChange,
    confirmBatchMove,
    openRenameDialog,
    closeRenameDialog,
    handleRenameDialogOpenChange,
    confirmRename,
  };
}
