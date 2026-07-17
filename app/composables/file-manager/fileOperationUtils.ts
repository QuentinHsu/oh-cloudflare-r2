export interface FileOperationNotify {
  success(message: string): void;
  warning(message: string): void;
  error(message: string): void;
}

export type FileOperationTranslate = (key: string, values?: Record<string, unknown>) => string;

export async function refreshFileIndexes(
  refreshFiles: () => Promise<unknown>,
  refreshFolders: () => Promise<unknown>,
  notify: FileOperationNotify,
  translate: FileOperationTranslate,
) {
  const results = await Promise.allSettled([refreshFiles(), refreshFolders()]);
  if (results.some((result) => result.status === "rejected")) {
    notify.warning(translate("notifications.refreshFailed"));
  }
}
