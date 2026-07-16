import { ref, type Ref } from "vue";
import type { FileApi } from "./useFileApi";
import { readFileApiError } from "./useFileApi";
import { refreshFileIndexes, type FileOperationNotify } from "./fileOperationUtils";

interface FileUploadDependencies {
  api: Pick<FileApi, "upload">;
  currentPath: Ref<string>;
  refreshFiles: () => Promise<unknown>;
  refreshFolders: () => Promise<unknown>;
  expandPathParents: (path: string) => void;
  notify: FileOperationNotify;
}

export function mergePendingFiles(current: readonly File[], incoming: readonly File[]) {
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

export function useFileUpload(dependencies: FileUploadDependencies) {
  const isUploading = ref(false);
  const showUploadDialog = ref(false);
  const uploadPathInput = ref("");
  const pendingFiles = ref<File[] | null>(null);

  function handleFilesSelected(files: FileList | File[]) {
    const incoming = Array.isArray(files) ? files : Array.from(files);
    if (!incoming.length) return;
    if (isUploading.value) {
      dependencies.notify.warning("正在上传，请稍后再试");
      return;
    }

    const merged = mergePendingFiles(
      showUploadDialog.value ? (pendingFiles.value ?? []) : [],
      incoming,
    );
    pendingFiles.value = merged.files;

    if (!showUploadDialog.value) {
      uploadPathInput.value = dependencies.currentPath.value;
      dependencies.expandPathParents(uploadPathInput.value);
      showUploadDialog.value = true;
    }
    if (merged.replacedCount) {
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
    formData.append("directory", uploadPathInput.value);
    pendingFiles.value.forEach((file) => formData.append("files", file));

    try {
      await dependencies.api.upload(formData);
      dependencies.notify.success("上传成功");
      cancelUpload();
      await refreshFileIndexes(
        dependencies.refreshFiles,
        dependencies.refreshFolders,
        dependencies.notify,
      );
    } catch (error: unknown) {
      dependencies.notify.error(readFileApiError(error).message);
    } finally {
      isUploading.value = false;
    }
  }

  return {
    isUploading,
    showUploadDialog,
    uploadPathInput,
    pendingFiles,
    handleFilesSelected,
    confirmUpload,
    cancelUpload,
    handleUploadDialogOpenChange,
    selectFolder,
  };
}
