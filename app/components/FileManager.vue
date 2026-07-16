<script setup lang="ts">
import { computed, watch } from "vue";
import { toast } from "vue-sonner";
import type { ApiResponse } from "../../shared/types/files";
import { useBatchFileOperations } from "../composables/file-manager/useBatchFileOperations";
import { useFileDropzone } from "../composables/file-manager/useFileDropzone";
import { createFileApi } from "../composables/file-manager/useFileApi";
import { useFileOperations } from "../composables/file-manager/useFileOperations";
import { useFilePreview } from "../composables/file-manager/useFilePreview";
import { useFileSelection } from "../composables/file-manager/useFileSelection";
import { useFileUpload } from "../composables/file-manager/useFileUpload";
import { useFileView } from "../composables/file-manager/useFileView";
import { useFolderBrowser } from "../composables/file-manager/useFolderBrowser";
import BatchMoveDialog from "./file-manager/BatchMoveDialog.vue";
import FileDropOverlay from "./file-manager/FileDropOverlay.vue";
import FileList from "./file-manager/FileList.vue";
import FileManagerToolbar from "./file-manager/FileManagerToolbar.vue";
import type { CopyUrlPayload, FilesResponse } from "./file-manager/types";
import FileViewControls from "./file-manager/FileViewControls.vue";
import MoveDialog from "./file-manager/MoveDialog.vue";
import PreviewDialog from "./file-manager/PreviewDialog.vue";
import RenameDialog from "./file-manager/RenameDialog.vue";
import UploadDialog from "./file-manager/UploadDialog.vue";

const { data: foldersResponse, refresh: refreshAllFolders } =
  await useFetch<ApiResponse<{ folders: string[] }>>("/api/files/folders");
const allFolders = computed(() =>
  foldersResponse.value?.ok ? foldersResponse.value.data.folders : [],
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
} = useFolderBrowser(allFolders);

const {
  data: filesResponse,
  refresh,
  status,
} = await useFetch<ApiResponse<FilesResponse>>("/api/files", {
  query: { path: currentPath },
  watch: [currentPath],
});
const filesData = computed(() => (filesResponse.value?.ok ? filesResponse.value.data : undefined));

const {
  searchQuery,
  sortField,
  sortDirection,
  visibleFolders,
  visibleFiles,
  hasActiveSearch,
  resultCount,
  clearSearch,
  toggleSortDirection,
} = useFileView(
  () => filesData.value?.folders ?? [],
  () => filesData.value?.files ?? [],
);

const hasSourceItems = computed(
  () => (filesData.value?.folders.length ?? 0) + (filesData.value?.files.length ?? 0) > 0,
);

const {
  selectedFiles,
  isSelectionMode,
  hasSelection,
  allSelected,
  clearSelection,
  replaceSelection,
  toggleSelectionMode,
  toggleFileSelection,
  toggleSelectAll,
} = useFileSelection(visibleFiles);

watch(searchQuery, clearSelection);

const requestFileApi = $fetch as unknown as (
  url: string,
  options?: Record<string, unknown>,
) => Promise<unknown>;
const fileApi = createFileApi(requestFileApi);

const upload = useFileUpload({
  api: fileApi,
  refreshFiles: refresh,
  refreshFolders: refreshAllFolders,
  notify: toast,
  currentPath,
  expandPathParents,
});

const operations = useFileOperations({
  api: fileApi,
  refreshFiles: refresh,
  refreshFolders: refreshAllFolders,
  confirmAction: (message) => window.confirm(message),
  notify: toast,
  expandPathParents,
});

const batchOperations = useBatchFileOperations({
  api: fileApi,
  refreshFiles: refresh,
  refreshFolders: refreshAllFolders,
  confirmAction: (message) => window.confirm(message),
  notify: toast,
  currentPath,
  selectedFiles,
  replaceSelection,
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

function handleNavigateFolder(folder: string) {
  navigateToFolder(folder);
  clearSearch();
}

function handleNavigatePath(index: number) {
  navigateToPath(index);
  clearSearch();
}

const {
  isUploading,
  showUploadDialog,
  uploadPathInput,
  pendingFiles,
  handleFilesSelected,
  confirmUpload,
  cancelUpload,
  handleUploadDialogOpenChange,
  selectFolder,
} = upload;

const {
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
} = operations;

const {
  isBatchMoving,
  isBatchDeleting,
  showBatchMoveDialog,
  batchMoveTargetPath,
  batchDelete,
  openBatchMoveDialog,
  closeBatchMoveDialog,
  handleBatchMoveDialogOpenChange,
  confirmBatchMove,
} = batchOperations;

const { isDraggingFiles } = useFileDropzone({
  isUploading,
  onFilesDropped: handleFilesSelected,
  notify: { warning: toast.warning },
});

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
  <div class="relative space-y-4">
    <FileDropOverlay v-if="isDraggingFiles" />

    <FileManagerToolbar
      :path-parts="pathParts"
      :is-selection-mode="isSelectionMode"
      :has-selection="hasSelection"
      :selected-count="selectedFiles.size"
      :is-batch-moving="isBatchMoving"
      :is-batch-deleting="isBatchDeleting"
      :is-uploading="isUploading"
      @navigate="handleNavigatePath"
      @toggle-selection="toggleSelectionMode"
      @open-batch-move="openBatchMoveDialog"
      @batch-delete="batchDelete"
      @files-selected="handleFilesSelected"
    />

    <FileViewControls
      :search-query="searchQuery"
      :sort-field="sortField"
      :sort-direction="sortDirection"
      :has-active-search="hasActiveSearch"
      :result-count="resultCount"
      @update:search-query="searchQuery = $event"
      @update:sort-field="sortField = $event"
      @toggle-sort-direction="toggleSortDirection"
      @clear-search="clearSearch"
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
      :folders="visibleFolders"
      :files="visibleFiles"
      :is-selection-mode="isSelectionMode"
      :selected-files="selectedFiles"
      :all-selected="allSelected"
      :has-selection="hasSelection"
      :has-active-search="hasActiveSearch"
      :search-query="searchQuery"
      :has-source-items="hasSourceItems"
      @navigate-folder="handleNavigateFolder"
      @clear-search="clearSearch"
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
