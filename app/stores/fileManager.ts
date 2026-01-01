import type { BlobObject } from '@nuxthub/core';

interface FileManagerState {
  currentPath: string;
  blobs: BlobObject[];
  folders: string[];
  hasMore: boolean;
}

export const useStoreFileManager = defineStore('fileManager', () => {
  const state = reactive<FileManagerState>({
    blobs: [],
    currentPath: '',
    folders: [],
    hasMore: false,
  });

  async function fetchCurrentPathData(path: string) {
    const response = await useAPI<{
      blobs: BlobObject[];
      folders?: string[];
      hasMore: boolean;
    }>('/api/blob', {
      method: 'GET',
      query: { folded: 'true', prefix: path },
    });
    state.blobs = response.data.blobs;
    state.folders = response.data.folders ?? [];
    state.hasMore = response.data.hasMore;
  }

  async function setCurrentPath(path: string) {
    state.currentPath = path;
    await fetchCurrentPathData(path);
  }

  async function navigateToFolder(folderName: string) {
    await setCurrentPath(folderName);
  }

  async function navigateUp(targetPath: string) {
    if (targetPath.length <= state.currentPath.length) {
      await setCurrentPath(targetPath);
    }
  }

  return {
    ...toRefs(state),
    fetchCurrentPathData,
    navigateToFolder,
    navigateUp,
    setCurrentPath,
  };
});
