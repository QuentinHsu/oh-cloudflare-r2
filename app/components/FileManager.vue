<script setup lang="ts">
import { toast } from "vue-sonner";
import FileManagerToolbar from "./file-manager/FileManagerToolbar.vue";
import FileList from "./file-manager/FileList.vue";
import UploadDialog from "./file-manager/UploadDialog.vue";
import PreviewDialog from "./file-manager/PreviewDialog.vue";
import RenameDialog from "./file-manager/RenameDialog.vue";
import MoveDialog from "./file-manager/MoveDialog.vue";
import BatchMoveDialog from "./file-manager/BatchMoveDialog.vue";
import { useFolderBrowser } from "../composables/file-manager/useFolderBrowser";
import { useFileSelection } from "../composables/file-manager/useFileSelection";
import { useFileMutations } from "../composables/file-manager/useFileMutations";
import { useFilePreview } from "../composables/file-manager/useFilePreview";
import type { CopyUrlPayload, FilesResponse } from "./file-manager/types";

const { data: allFolders, refresh: refreshAllFolders } = await useFetch<{ folders: string[] }>(
  "/api/files/folders",
);

const {
  currentPath,
  pathParts,
  folderTree,
  expandedFolders,
  navigateToFolder,
  navigateToPath,
  toggleFolder,
  expandPathParents,
} = useFolderBrowser(() => allFolders.value?.folders ?? []);

const { data, refresh, status } = await useFetch<FilesResponse>("/api/files", {
  query: { prefix: currentPath },
  watch: [currentPath],
});

const {
  selectedFiles,
  isSelectionMode,
  hasSelection,
  allSelected,
  clearSelection,
  toggleSelectionMode,
  toggleFileSelection,
  toggleSelectAll,
} = useFileSelection(() => data.value?.files ?? []);

const mutations = useFileMutations({
  request: async (url, options) => {
    await $fetch(url, options);
  },
  refreshFiles: refresh,
  refreshFolders: refreshAllFolders,
  confirmAction: (message) => window.confirm(message),
  notify: toast,
  currentPath,
  selectedFiles,
  clearSelection,
  expandPathParents,
});

const preview = useFilePreview({
  getOrigin: () => window.location.origin,
  writeClipboard: (text) => navigator.clipboard.writeText(text),
  notify: toast,
});

function handleCopyUrl(payload: CopyUrlPayload) {
  void preview.copyUrl(payload.pathname, payload.type);
}

const {
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
} = mutations;

const {
  previewFile,
  showPreviewDialog,
  getFileUrl,
  openPreview,
  handlePreviewOpenChange,
  copyPreviewRaw,
  copyPreviewMarkdown,
} = preview;
</script>

<template>
  <div class="space-y-4">
    <FileManagerToolbar
      :path-parts="pathParts"
      :is-selection-mode="isSelectionMode"
      :has-selection="hasSelection"
      :selected-count="selectedFiles.size"
      :is-batch-moving="isBatchMoving"
      :is-batch-deleting="isBatchDeleting"
      :is-uploading="isUploading"
      @navigate="navigateToPath"
      @toggle-selection="toggleSelectionMode"
      @open-batch-move="openBatchMoveDialog"
      @batch-delete="batchDelete"
      @files-selected="handleFilesSelected"
    />

    <UploadDialog
      :open="showUploadDialog"
      :pending-count="pendingFiles?.length || 0"
      :upload-path="uploadPathInput"
      :folder-tree="folderTree"
      :expanded-folders="expandedFolders"
      :is-uploading="isUploading"
      @update:open="handleUploadDialogOpenChange"
      @update:upload-path="uploadPathInput = $event"
      @toggle-folder="toggleFolder"
      @select-folder="selectFolder"
      @confirm="confirmUpload"
      @cancel="cancelUpload"
    />

    <FileList
      :status="status"
      :folders="data?.folders || []"
      :files="data?.files || []"
      :is-selection-mode="isSelectionMode"
      :selected-files="selectedFiles"
      :all-selected="allSelected"
      :has-selection="hasSelection"
      @navigate-folder="navigateToFolder"
      @toggle-select-all="toggleSelectAll"
      @toggle-file="toggleFileSelection"
      @open-preview="openPreview"
      @copy-url="handleCopyUrl"
      @rename="openRenameDialog"
      @move="openMoveDialog"
      @delete="deleteFile"
    />

    <PreviewDialog
      :open="showPreviewDialog"
      :file-name="previewFile?.pathname.split('/').pop()"
      :src="previewFile ? getFileUrl(previewFile.pathname) : ''"
      @update:open="handlePreviewOpenChange"
      @copy-raw="copyPreviewRaw"
      @copy-markdown="copyPreviewMarkdown"
    />

    <RenameDialog
      :open="showRenameDialog"
      :current-name="renameFile?.pathname.split('/').pop()"
      :new-file-name="newFileName"
      :is-renaming="isRenaming"
      @update:open="handleRenameDialogOpenChange"
      @update:new-file-name="newFileName = $event"
      @confirm="confirmRename"
      @cancel="closeRenameDialog"
    />

    <MoveDialog
      :open="showMoveDialog"
      :file-name="moveFile?.pathname.split('/').pop()"
      :folder-tree="folderTree"
      :expanded-folders="expandedFolders"
      :target-path="moveTargetPath"
      :is-moving="isMoving"
      @update:open="handleMoveDialogOpenChange"
      @update:target-path="moveTargetPath = $event"
      @toggle-folder="toggleFolder"
      @confirm="confirmMove"
      @cancel="closeMoveDialog"
    />

    <BatchMoveDialog
      :open="showBatchMoveDialog"
      :count="selectedFiles.size"
      :folder-tree="folderTree"
      :expanded-folders="expandedFolders"
      :target-path="batchMoveTargetPath"
      :is-batch-moving="isBatchMoving"
      @update:open="handleBatchMoveDialogOpenChange"
      @update:target-path="batchMoveTargetPath = $event"
      @toggle-folder="toggleFolder"
      @confirm="confirmBatchMove"
      @cancel="closeBatchMoveDialog"
    />
  </div>
</template>
