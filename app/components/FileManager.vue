<script setup lang="ts">
import { Upload } from "@lucide/vue";
import { computed, ref, watch } from "vue";
import { toast } from "vue-sonner";
import type { ApiResponse } from "../../shared/types/files";
import { useBatchFileOperations } from "../composables/file-manager/useBatchFileOperations";
import { useFileDropzone } from "../composables/file-manager/useFileDropzone";
import { createFileApi } from "../composables/file-manager/useFileApi";
import { useFileOperations } from "../composables/file-manager/useFileOperations";
import { useFilePreview } from "../composables/file-manager/useFilePreview";
import { createFilePresentation } from "../composables/file-manager/useFilePresentation";
import { useFileSelection } from "../composables/file-manager/useFileSelection";
import { useFileUpload } from "../composables/file-manager/useFileUpload";
import { useFileView } from "../composables/file-manager/useFileView";
import { useFolderBrowser } from "../composables/file-manager/useFolderBrowser";
import AppSidebar from "./AppSidebar.vue";
import BatchMoveDialog from "./file-manager/BatchMoveDialog.vue";
import BatchDeleteAlertDialog from "./file-manager/BatchDeleteAlertDialog.vue";
import DeleteAlertDialog from "./file-manager/DeleteAlertDialog.vue";
import FileDropOverlay from "./file-manager/FileDropOverlay.vue";
import FileBulkToolbar from "./file-manager/FileBulkToolbar.vue";
import FileDashboardHeader from "./file-manager/FileDashboardHeader.vue";
import FileStatePanel from "./file-manager/FileStatePanel.vue";
import FileStats from "./file-manager/FileStats.vue";
import FileTable from "./file-manager/FileTable.vue";
import type { CopyUrlPayload, FileListLike, FilesResponse } from "./file-manager/types";
import MoveDialog from "./file-manager/MoveDialog.vue";
import PreviewDialog from "./file-manager/PreviewDialog.vue";
import RenameDialog from "./file-manager/RenameDialog.vue";
import UploadDialog from "./file-manager/UploadDialog.vue";

const { locale, t } = useI18n();
const fileInputRef = ref<HTMLInputElement | null>(null);

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
  navigateToDirectory,
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
const filesError = computed(() =>
  filesResponse.value && !filesResponse.value.ok ? filesResponse.value.error : undefined,
);

const presentation = computed(() => createFilePresentation(locale.value, t));
const directorySummary = computed(() =>
  presentation.value.summarizeDirectory(
    filesData.value?.folders ?? [],
    filesData.value?.files ?? [],
  ),
);

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
const isEmptyDirectory = computed(
  () =>
    !hasActiveSearch.value &&
    !hasSourceItems.value &&
    status.value !== "pending" &&
    !filesError.value,
);
const hasNoResults = computed(
  () => hasActiveSearch.value && hasSourceItems.value && resultCount.value === 0,
);
const panelState = computed(() => {
  if (status.value === "pending") return { kind: "loading" } as const;
  if (filesError.value) return { kind: "error" } as const;
  if (isEmptyDirectory.value) return { kind: "empty" } as const;
  if (hasNoResults.value) {
    return { kind: "no-results", query: searchQuery.value, count: 0 } as const;
  }
  return undefined;
});
const directoryName = computed(() => pathParts.value.at(-1) ?? t("files.rootTitle"));

const {
  selectedFiles,
  allSelected,
  clearSelection,
  replaceSelection,
  toggleFileSelection,
  toggleSelectAll,
} = useFileSelection(visibleFiles);

watch(searchQuery, clearSelection);

const requestFileApi = $fetch as unknown as (
  url: string,
  options?: Record<string, unknown>,
) => Promise<unknown>;
const fileApi = createFileApi(requestFileApi, t("errors.storageUnavailable"));

const upload = useFileUpload({
  api: fileApi,
  refreshFiles: refresh,
  refreshFolders: refreshAllFolders,
  notify: toast,
  translate: t,
  currentPath,
  expandPathParents,
});

const operations = useFileOperations({
  api: fileApi,
  refreshFiles: refresh,
  refreshFolders: refreshAllFolders,
  notify: toast,
  translate: t,
  expandPathParents,
});

const batchOperations = useBatchFileOperations({
  api: fileApi,
  refreshFiles: refresh,
  refreshFolders: refreshAllFolders,
  notify: toast,
  translate: t,
  currentPath,
  selectedFiles,
  replaceSelection,
  expandPathParents,
});

const preview = useFilePreview({
  getOrigin: () => window.location.origin,
  writeClipboard: (text) => navigator.clipboard.writeText(text),
  notify: toast,
  translate: t,
});

function handleCopyUrl(payload: CopyUrlPayload) {
  void preview.copyUrl(payload.pathname, payload.type);
}

function handleNavigateFolder(folder: string) {
  navigateToFolder(folder);
  clearSearch();
}

function handleNavigateDirectory(path: string) {
  navigateToDirectory(path);
  clearSearch();
}

function handleNavigatePath(index: number) {
  navigateToPath(index);
  clearSearch();
}

function triggerUpload() {
  fileInputRef.value?.click();
}

function handleFileInputChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const sourceFiles = input.files ? Array.from(input.files) : [];

  if (sourceFiles.length) {
    const files = sourceFiles.slice() as FileListLike;
    files.item = (index: number) => sourceFiles[index] ?? null;
    handleFilesSelected(files);
  }

  input.value = "";
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
} = operations;

const {
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
} = batchOperations;

const { isDraggingFiles } = useFileDropzone({
  isUploading,
  onFilesDropped: handleFilesSelected,
  notify: { warning: toast.warning },
  translate: t,
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
  <SidebarProvider>
    <FileDropOverlay v-if="isDraggingFiles" />

    <AppSidebar
      :folder-tree="folderTree"
      :current-path="currentPath"
      :expanded-folders="expandedFolders"
      :is-uploading="isUploading"
      @navigate="handleNavigateDirectory"
      @toggle-folder="toggleFolder"
      @files-selected="handleFilesSelected"
    />

    <SidebarInset>
      <FileDashboardHeader :path-parts="pathParts" @navigate="handleNavigatePath" />

      <main class="relative flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <h1 class="truncate text-2xl font-semibold tracking-tight">
              {{ t("files.title", { name: directoryName }) }}
            </h1>
            <p class="mt-1 text-sm text-muted-foreground">{{ t("files.description") }}</p>
          </div>
          <Button class="min-h-11 md:min-h-9" :disabled="isUploading" @click="triggerUpload">
            <Upload class="size-4" />
            {{ t("sidebar.upload") }}
          </Button>
          <input
            ref="fileInputRef"
            type="file"
            multiple
            class="hidden"
            @change="handleFileInputChange"
          />
        </div>

        <FileStats
          :summary="directorySummary"
          :format-size="presentation.formatSize"
          :format-relative-time="presentation.formatRelativeTime"
        />

        <FileBulkToolbar
          :selected-count="selectedFiles.size"
          :is-moving="isBatchMoving"
          :is-deleting="isBatchDeleting"
          @move="openBatchMoveDialog"
          @delete="openBatchDeleteDialog"
          @clear="clearSelection"
        />

        <FileStatePanel
          v-if="panelState"
          :state="panelState"
          @retry="refresh"
          @upload="triggerUpload"
          @clear-search="clearSearch"
        />

        <FileTable
          v-else
          :folders="visibleFolders"
          :files="visibleFiles"
          :selected-files="selectedFiles"
          :all-selected="allSelected"
          :search-query="searchQuery"
          :sort-field="sortField"
          :sort-direction="sortDirection"
          :has-active-search="hasActiveSearch"
          :result-count="resultCount"
          :format-size="presentation.formatSize"
          :format-date="presentation.formatDate"
          :format-file-type="presentation.formatFileType"
          @update:search-query="searchQuery = $event"
          @update:sort-field="sortField = $event"
          @toggle-sort-direction="toggleSortDirection"
          @clear-search="clearSearch"
          @navigate-folder="handleNavigateFolder"
          @toggle-select-all="toggleSelectAll"
          @toggle-file="toggleFileSelection"
          @open-preview="openPreview"
          @copy-url="handleCopyUrl"
          @rename="openRenameDialog"
          @move="openMoveDialog"
          @delete="openDeleteDialog"
        />
      </main>
    </SidebarInset>

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

    <DeleteAlertDialog
      :open="showDeleteDialog"
      :file-name="deletePath.split('/').pop() || deletePath"
      :is-deleting="isDeleting"
      @update:open="handleDeleteDialogOpenChange"
      @confirm="confirmDelete"
      @cancel="closeDeleteDialog"
    />

    <BatchDeleteAlertDialog
      :open="showBatchDeleteDialog"
      :count="selectedFiles.size"
      :is-deleting="isBatchDeleting"
      @update:open="handleBatchDeleteDialogOpenChange"
      @confirm="confirmBatchDelete"
      @cancel="closeBatchDeleteDialog"
    />
  </SidebarProvider>
</template>
