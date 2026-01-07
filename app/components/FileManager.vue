<script setup lang="ts">
import { toast } from 'vue-sonner'
import FileManagerToolbar from './file-manager/FileManagerToolbar.vue'
import FileList from './file-manager/FileList.vue'
import UploadDialog from './file-manager/UploadDialog.vue'
import PreviewDialog from './file-manager/PreviewDialog.vue'
import RenameDialog from './file-manager/RenameDialog.vue'
import MoveDialog from './file-manager/MoveDialog.vue'
import BatchMoveDialog from './file-manager/BatchMoveDialog.vue'
import type { BlobFile, FilesResponse, FolderNode } from './file-manager/types'

const currentPath = ref('')
const pathParts = computed(() => currentPath.value.split('/').filter(Boolean))

const { data, refresh, status } = await useFetch<FilesResponse>('/api/files', {
  query: { prefix: currentPath },
  watch: [currentPath],
})

// 获取所有文件夹路径（用于上传时选择）
const { data: allFolders, refresh: refreshAllFolders } = await useFetch<{ folders: string[] }>('/api/files/folders')

const isUploading = ref(false)
const showUploadDialog = ref(false)
const uploadPathInput = ref('')
const pendingFiles = ref<FileList | null>(null)
const previewFile = ref<BlobFile | null>(null)
const showPreviewDialog = ref(false)

// 移动文件相关
const showMoveDialog = ref(false)
const moveFile = ref<BlobFile | null>(null)
const moveTargetPath = ref('')
const isMoving = ref(false)

// 批量选择相关
const selectedFiles = ref<Set<string>>(new Set())
const isSelectionMode = ref(false)
const isBatchMoving = ref(false)
const isBatchDeleting = ref(false)
const showBatchMoveDialog = ref(false)
const batchMoveTargetPath = ref('')

// 重命名相关
const showRenameDialog = ref(false)
const renameFile = ref<BlobFile | null>(null)
const newFileName = ref('')
const isRenaming = ref(false)

const hasSelection = computed(() => selectedFiles.value.size > 0)
const allSelected = computed(() => {
  if (!data.value?.files.length) return false
  return data.value.files.every(f => selectedFiles.value.has(f.pathname))
})

// 计算最终上传路径
const finalUploadPath = computed(() => {
  const path = uploadPathInput.value.trim().replace(/^\/+|\/+$/g, '')
  return path ? `${path}/` : ''
})

// 构建文件夹树结构
const folderTree = computed<FolderNode[]>(() => {
  if (!allFolders.value?.folders?.length) return []

  const root: FolderNode[] = []
  const folders = allFolders.value.folders

  folders.forEach((folderPath) => {
    const parts = folderPath.replace(/\/$/, '').split('/').filter(Boolean)
    let currentLevel = root

    parts.forEach((part, index) => {
      const path = parts.slice(0, index + 1).join('/')
      let existing = currentLevel.find((n) => n.name === part)

      if (!existing) {
        existing = { name: part, path, children: [] }
        currentLevel.push(existing)
      }
      currentLevel = existing.children
    })
  })

  return root
})

const expandedFolders = ref<string[]>([])

function toggleFolder(path: string) {
  const index = expandedFolders.value.indexOf(path)
  if (index > -1) {
    expandedFolders.value.splice(index, 1)
  }
  else {
    expandedFolders.value.push(path)
  }
}

// 展开路径的所有父级文件夹
function expandPathParents(path: string) {
  if (!path) return
  const parts = path.replace(/\/$/, '').split('/').filter(Boolean)
  const toExpand: string[] = []
  for (let i = 1; i <= parts.length; i++) {
    toExpand.push(parts.slice(0, i).join('/'))
  }
  // 合并到 expandedFolders，避免重复
  toExpand.forEach((p) => {
    if (!expandedFolders.value.includes(p)) {
      expandedFolders.value.push(p)
    }
  })
}

function selectFolder(path: string) {
  uploadPathInput.value = path
}

function navigateToFolder(folder: string) {
  currentPath.value = currentPath.value ? `${currentPath.value}${folder}/` : `${folder}/`
}

function navigateToPath(index: number) {
  if (index === -1) {
    currentPath.value = ''
  }
  else {
    currentPath.value = pathParts.value.slice(0, index + 1).join('/') + '/'
  }
}

function handleFilesSelected(files: FileList) {
  if (!files.length) return
  pendingFiles.value = files
  uploadPathInput.value = currentPath.value.replace(/\/$/, '')
  expandPathParents(uploadPathInput.value)
  showUploadDialog.value = true
}

async function confirmUpload() {
  if (!pendingFiles.value?.length) return

  isUploading.value = true
  const formData = new FormData()

  for (const file of pendingFiles.value) {
    formData.append('files', file)
  }

  try {
    await $fetch(`/api/files/upload?prefix=${encodeURIComponent(finalUploadPath.value)}`, {
      method: 'POST',
      body: formData,
    })
    toast.success('上传成功')
    showUploadDialog.value = false
    pendingFiles.value = null
    refresh()
    refreshAllFolders()
  }
  catch (e) {
    toast.error('上传失败')
  }
  finally {
    isUploading.value = false
  }
}

function cancelUpload() {
  showUploadDialog.value = false
  pendingFiles.value = null
}

async function deleteFile(pathname: string) {
  if (!confirm('确定要删除这个文件吗？')) return

  try {
    await $fetch(`/api/files/${encodeURIComponent(pathname)}`, { method: 'DELETE' })
    toast.success('删除成功')
    refresh()
  }
  catch {
    toast.error('删除失败')
  }
}

function getFileUrl(pathname: string) {
  return `/api/blob/${pathname}`
}

function copyUrl(pathname: string, type: 'raw' | 'markdown') {
  const url = `${window.location.origin}${getFileUrl(pathname)}`
  const filename = pathname.split('/').pop() || pathname

  const text = type === 'markdown' ? `![${filename}](${url})` : url

  navigator.clipboard.writeText(text)
  toast.success(type === 'markdown' ? 'Markdown 链接已复制' : '链接已复制')
}

function openPreview(file: BlobFile) {
  previewFile.value = file
  showPreviewDialog.value = true
}

function handlePreviewOpenChange(open: boolean) {
  if (!open) {
    showPreviewDialog.value = false
    previewFile.value = null
  }
  else {
    showPreviewDialog.value = true
  }
}

function openMoveDialog(file: BlobFile) {
  moveFile.value = file
  // 默认填入当前文件所在目录
  const parts = file.pathname.split('/')
  parts.pop()
  moveTargetPath.value = parts.length ? parts.join('/') : ''
  expandPathParents(moveTargetPath.value)
  showMoveDialog.value = true
}

function handleMoveDialogOpenChange(open: boolean) {
  if (!open) {
    closeMoveDialog()
  }
  else {
    showMoveDialog.value = true
  }
}

function closeMoveDialog() {
  showMoveDialog.value = false
  moveFile.value = null
  moveTargetPath.value = ''
}

async function confirmMove() {
  if (!moveFile.value) return

  const filename = moveFile.value.pathname.split('/').pop()
  const targetDir = moveTargetPath.value.trim().replace(/^\/+|\/+$/g, '')
  const newPath = targetDir ? `${targetDir}/${filename}` : filename

  if (newPath === moveFile.value.pathname) {
    toast.error('目标路径与原路径相同')
    return
  }

  isMoving.value = true
  try {
    await $fetch('/api/files/move', {
      method: 'POST',
      body: { oldPath: moveFile.value.pathname, newPath },
    })
    toast.success('移动成功')
    closeMoveDialog()
    refresh()
    refreshAllFolders()
  } catch (e: any) {
    toast.error(e.data?.message || '移动失败')
  } finally {
    isMoving.value = false
  }
}

// 批量选择相关函数
function toggleSelectionMode() {
  isSelectionMode.value = !isSelectionMode.value
  if (!isSelectionMode.value) {
    selectedFiles.value.clear()
  }
}

function toggleFileSelection(pathname: string) {
  if (selectedFiles.value.has(pathname)) {
    selectedFiles.value.delete(pathname)
  } else {
    selectedFiles.value.add(pathname)
  }
}

function toggleSelectAll() {
  if (!data.value?.files.length) return
  if (allSelected.value) {
    selectedFiles.value.clear()
  } else {
    data.value.files.forEach(f => selectedFiles.value.add(f.pathname))
  }
}

async function batchDelete() {
  if (!selectedFiles.value.size) return
  if (!confirm(`确定要删除选中的 ${selectedFiles.value.size} 个文件吗？`)) return

  isBatchDeleting.value = true
  const paths = Array.from(selectedFiles.value)
  let successCount = 0
  let failCount = 0

  for (const pathname of paths) {
    try {
      await $fetch(`/api/files/${encodeURIComponent(pathname)}`, { method: 'DELETE' })
      successCount++
    } catch {
      failCount++
    }
  }

  if (failCount === 0) {
    toast.success(`成功删除 ${successCount} 个文件`)
  } else {
    toast.warning(`删除完成：${successCount} 成功，${failCount} 失败`)
  }

  selectedFiles.value.clear()
  isBatchDeleting.value = false
  refresh()
  refreshAllFolders()
}

function openBatchMoveDialog() {
  if (!selectedFiles.value.size) return
  batchMoveTargetPath.value = currentPath.value.replace(/\/$/, '')
  expandPathParents(batchMoveTargetPath.value)
  showBatchMoveDialog.value = true
}

function closeBatchMoveDialog() {
  showBatchMoveDialog.value = false
  batchMoveTargetPath.value = ''
}

function handleBatchMoveDialogOpenChange(open: boolean) {
  if (!open) {
    closeBatchMoveDialog()
  }
  else {
    showBatchMoveDialog.value = true
  }
}

async function confirmBatchMove() {
  if (!selectedFiles.value.size) return

  isBatchMoving.value = true
  const paths = Array.from(selectedFiles.value)
  const targetDir = batchMoveTargetPath.value.trim().replace(/^\/+|\/+$/g, '')
  let successCount = 0
  let failCount = 0

  for (const oldPath of paths) {
    const filename = oldPath.split('/').pop()
    const newPath = targetDir ? `${targetDir}/${filename}` : filename

    if (newPath === oldPath) continue

    try {
      await $fetch('/api/files/move', {
        method: 'POST',
        body: { oldPath, newPath },
      })
      successCount++
    } catch {
      failCount++
    }
  }

  if (failCount === 0) {
    toast.success(`成功移动 ${successCount} 个文件`)
  } else {
    toast.warning(`移动完成：${successCount} 成功，${failCount} 失败`)
  }

  selectedFiles.value.clear()
  closeBatchMoveDialog()
  isBatchMoving.value = false
  refresh()
  refreshAllFolders()
}

// 重命名相关函数
function openRenameDialog(file: BlobFile) {
  renameFile.value = file
  const currentName = file.pathname.split('/').pop() || ''
  newFileName.value = currentName
  showRenameDialog.value = true
}

function closeRenameDialog() {
  showRenameDialog.value = false
  renameFile.value = null
  newFileName.value = ''
}

function handleRenameDialogOpenChange(open: boolean) {
  if (!open) {
    closeRenameDialog()
  }
  else {
    showRenameDialog.value = true
  }
}

function handleUploadDialogOpenChange(open: boolean) {
  if (!open) {
    cancelUpload()
  }
  else {
    showUploadDialog.value = true
  }
}

async function confirmRename() {
  if (!renameFile.value) return

  const trimmedName = newFileName.value.trim()
  if (!trimmedName) {
    toast.error('文件名不能为空')
    return
  }

  if (trimmedName === renameFile.value.pathname.split('/').pop()) {
    toast.error('文件名未改变')
    return
  }

  // 验证文件名（不允许包含 / 等特殊字符）
  if (/[\/\\]/.test(trimmedName)) {
    toast.error('文件名不能包含 / 或 \\ 字符')
    return
  }

  const parts = renameFile.value.pathname.split('/')
  parts.pop()
  const newPath = parts.length ? `${parts.join('/')}/${trimmedName}` : trimmedName

  isRenaming.value = true
  try {
    // 复用移动 API，重命名实际就是同目录移动
    // 成本：1次读取 + 1次写入 + 1次删除 = 3次操作
    await $fetch('/api/files/move', {
      method: 'POST',
      body: { oldPath: renameFile.value.pathname, newPath },
    })
    toast.success('重命名成功')
    closeRenameDialog()
    refresh()
  } catch (e: any) {
    toast.error(e.data?.message || '重命名失败')
  } finally {
    isRenaming.value = false
  }
}

function handleCopyUrl(payload: { pathname: string; type: 'raw' | 'markdown' }) {
  copyUrl(payload.pathname, payload.type)
}

function copyPreviewRaw() {
  if (previewFile.value) copyUrl(previewFile.value.pathname, 'raw')
}

function copyPreviewMarkdown() {
  if (previewFile.value) copyUrl(previewFile.value.pathname, 'markdown')
}
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
