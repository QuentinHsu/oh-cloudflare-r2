export interface FileOperationNotify {
  success(message: string): void;
  warning(message: string): void;
  error(message: string): void;
}

export async function refreshFileIndexes(
  refreshFiles: () => Promise<unknown>,
  refreshFolders: () => Promise<unknown>,
  notify: FileOperationNotify,
) {
  const results = await Promise.allSettled([refreshFiles(), refreshFolders()]);
  if (results.some((result) => result.status === "rejected")) {
    notify.warning("数据刷新失败，当前列表可能不是最新状态");
  }
}
