import { defineStore } from 'pinia'
import { getBlobList } from '~/server/blob'
import type { FileManagerState, TreeNode } from '~~/schema/fileManager.js'

export const useStoreFileManager = defineStore('fileManager', () => {
  const state = reactive<FileManagerState>({
    currentPath: '',
    blobs: [],
    folders: [],
    hasMore: false,
  })

  const treeStructure = ref<TreeNode[]>([])
  const updateTreeStructure = () => {
    treeStructure.value = [
      ...state.folders.map(folder => ({ name: folder, isFolder: true })),
      ...state.blobs.map(blob => ({ name: blob.pathname, isFolder: false })),
    ]
  }
  const fetchCurrentPathData = async (path: string) => {
    const response = await getBlobList({ prefix: path, folded: true })
    state.blobs = response.data.blobs.map(blob => ({
      ...blob,
      uploadedAt: blob.uploadedAt.toString(),
      contentType: blob.contentType != null ? blob.contentType : '',
      customMetadata: blob.customMetadata || {},
    }))
    state.folders = response.data.folders ?? []
    state.hasMore = response.data.hasMore
    updateTreeStructure()
  }

  const setCurrentPath = async (path: string) => {
    state.currentPath = path

    await fetchCurrentPathData(path)
  }
  const navigateToFolder = async (folderName: string) => {
    await setCurrentPath(folderName)
  }

  const navigateUp = async (targetPath: string) => {
    if (targetPath.length <= state.currentPath.length) {
      await setCurrentPath(targetPath)
    }
  }

  return {
    ...toRefs(state),
    treeStructure,
    setCurrentPath,
    navigateToFolder,
    navigateUp,
    fetchCurrentPathData,
  }
})
