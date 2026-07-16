import { ref } from "vue";
import type { BlobFile } from "../../components/file-manager/types";
import { buildFileLink, type FileLinkType } from "../../components/file-manager/utils";

interface FilePreviewDependencies {
  getOrigin: () => string;
  writeClipboard: (text: string) => Promise<void>;
  notify: {
    success: (message: string) => void;
    error: (message: string) => void;
  };
}

function getFileUrl(pathname: string) {
  return `/api/blob/${pathname}`;
}

export function useFilePreview(dependencies: FilePreviewDependencies) {
  const previewFile = ref<BlobFile | null>(null);
  const showPreviewDialog = ref(false);

  function openPreview(file: BlobFile) {
    previewFile.value = file;
    showPreviewDialog.value = true;
  }

  function handlePreviewOpenChange(open: boolean) {
    showPreviewDialog.value = open;
    if (!open) previewFile.value = null;
  }

  async function copyUrl(pathname: string, type: FileLinkType) {
    try {
      await dependencies.writeClipboard(buildFileLink(dependencies.getOrigin(), pathname, type));
      dependencies.notify.success(type === "markdown" ? "Markdown 链接已复制" : "链接已复制");
    } catch {
      dependencies.notify.error("复制失败");
    }
  }

  async function copyPreviewRaw() {
    if (previewFile.value) await copyUrl(previewFile.value.pathname, "raw");
  }

  async function copyPreviewMarkdown() {
    if (previewFile.value) await copyUrl(previewFile.value.pathname, "markdown");
  }

  return {
    previewFile,
    showPreviewDialog,
    getFileUrl,
    openPreview,
    handlePreviewOpenChange,
    copyUrl,
    copyPreviewRaw,
    copyPreviewMarkdown,
  };
}
