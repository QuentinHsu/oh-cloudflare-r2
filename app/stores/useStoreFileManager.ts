// stores/fileManager.ts

import { defineStore } from 'pinia'
import { getBlobList } from '~/server/blob'
import type { BlobInfo, FileManagerState, TreeNode } from '~~/schema/fileManager.js'

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
    state.blobs = response.blobs
    state.folders = response.folders
    state.hasMore = response.hasMore
    updateTreeStructure()
  }

  const setCurrentPath = async (path: string) => {
    state.currentPath = path
    // 这里应该调用一个方法来获取新路径的数据
    await fetchCurrentPathData(path)
  }
  const navigateToFolder = async (folderName: string) => {
    // const newPath = state.currentPath === '/'
    //   ? `/${folderName}`
    //   : `${state.currentPath}${folderName}`
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
