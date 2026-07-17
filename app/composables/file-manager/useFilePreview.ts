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
  translate: (key: string) => string;
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
      const messageKey =
        type === "markdown" ? "notifications.copyMarkdownSuccess" : "notifications.copyLinkSuccess";
      dependencies.notify.success(dependencies.translate(messageKey));
    } catch {
      dependencies.notify.error(dependencies.translate("notifications.copyFailed"));
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
