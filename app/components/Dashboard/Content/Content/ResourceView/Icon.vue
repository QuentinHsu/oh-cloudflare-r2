<script setup lang="tsx">
import type { TableProps } from 'tdesign-vue-next'
import { DialogDeleteBlobs, Icon } from '#components'
import { useStoreFileManager } from '~/stores/useStoreFileManager'

const fileManagerStore = useStoreFileManager()
const { blobs, folders } = storeToRefs(fileManagerStore)
const selectedItems = ref<IFileItem[]>([])
export interface IFileItem {
  type: 'folder' | 'file'
  path: string
  size?: number | null
}
const items = computed(() => [
  ...folders.value.map(folder => ({ type: 'folder', path: folder, size: null })),
  ...blobs.value.map(blob => ({ type: 'file', path: blob.pathname, size: blob.size })),
])

function navigateToFolder(folder: string) {
  fileManagerStore.navigateToFolder(folder)
}

function formatSize(size: number | null): string {
  if (size === null)
    return '-'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }
  return `${size.toFixed(2)} ${units[i]}`
}

function getLastPathSegment(path: string): string {
  const trimmedPath = path.replace(/\/+$/, '')
  return trimmedPath.split('/').pop() || ''
}

type IconName =
  | 'i-flat-color-icons:folder'
  | 'i-flat-color-icons:document'
  | 'i-flat-color-icons:audio-file'
  | 'i-flat-color-icons:file'
  | 'i-flat-color-icons:image-file'
  | 'i-flat-color-icons:video-file'

function getIconName(type: string, fileName: string): IconName {
  if (type === 'folder')
    return 'i-flat-color-icons:folder'

  const extension = fileName.match(/\.([^.]+)$/)?.[1]?.toLowerCase()
  const iconMap: Record<string, IconName> = {
    doc: 'i-flat-color-icons:document',
    docx: 'i-flat-color-icons:document',
    pdf: 'i-flat-color-icons:document',
    txt: 'i-flat-color-icons:document',
    mp3: 'i-flat-color-icons:audio-file',
    wav: 'i-flat-color-icons:audio-file',
    ogg: 'i-flat-color-icons:audio-file',
    jpg: 'i-flat-color-icons:image-file',
    jpeg: 'i-flat-color-icons:image-file',
    png: 'i-flat-color-icons:image-file',
    gif: 'i-flat-color-icons:image-file',
    webp: 'i-flat-color-icons:image-file',
    mp4: 'i-flat-color-icons:video-file',
    avi: 'i-flat-color-icons:video-file',
    mov: 'i-flat-color-icons:video-file',
  }
  return extension ? (iconMap[extension] ?? 'i-flat-color-icons:file') : 'i-flat-color-icons:file'
}

function getFileType(type: string, fileName: string): string {
  if (type === 'folder')
    return 'Folder'
  const extension = fileName.match(/\.([^.]+)$/)?.[1]?.toLowerCase() || 'Unknown'
  return extension.charAt(0).toLowerCase() + extension.slice(1)
}
const visiblePopConfirmDelete = ref(false)
async function onClickDelete(item: IFileItem) {
  selectedItems.value = [item]
  visiblePopConfirmDelete.value = true
}

function onClickCopy(item: IFileItem) {
  const domain = window.location.origin
  const markdown = `${domain}/images/${item.path}`
  navigator.clipboard.writeText(markdown)
}
function onClickCopyWithMarkdown(item: IFileItem) {
  const domain = window.location.origin
  const markdown = `![${getLastPathSegment(item.path)}](${domain}/images/${item.path})`
  navigator.clipboard.writeText(markdown)
}

const columns: TableProps['columns'] = [
  { colKey: 'name', title: 'Name', width: '50%', cell: (h, { row }: any) => {
    return (
      <div class="flex items-center cursor-pointer" onClick={() => row.type === 'folder' && navigateToFolder(row.path)}>
        <Icon name={getIconName(row.type, getLastPathSegment(row.path))} class="text-6 mr-2" />
        { getLastPathSegment(row.path) }
      </div>
    )
  } },
  { colKey: 'type', title: 'Type', width: '15%', cell: (h, { row }) => {
    return (
      <span>{ getFileType(row.type, getLastPathSegment(row.path)) }</span>
    )
  } },
  { colKey: 'size', title: 'Size', width: '15%', cell: (h, { row }) => {
    return (
      <span>{ formatSize(row.size) }</span>
    )
  } },
  { colKey: 'actions', title: 'Actions', width: '20%', cell: (h, { row }) => {
    return (
      <div class="flex items-center space-x-2">
        <div onClick={() => onClickDelete({ type: row.type, path: row.path })} class="flex items-center">
          <Icon name="material-symbols-light:delete-forever-outline" class="text-7 cursor-pointer" />
        </div>
        { row.type !== 'folder' && (
          <>
            <div onClick={() => onClickCopy({ path: row.path, type: row.type })} class="flex items-center">
              <t-popup content="Copy" className="flex items-center">
                <Icon name="material-symbols-light:content-copy-outline-rounded" class="text-6 cursor-pointer" />
              </t-popup>
            </div>
            <div onClick={() => onClickCopyWithMarkdown({ path: row.path, type: row.type })} class="flex items-center">
              <t-popup content="Copy with Markdown" className="flex items-center">
                <Icon name="material-symbols-light:markdown-copy-outline-rounded" class="text-6 cursor-pointer" />
              </t-popup>
            </div>
          </>
        ) }
      </div>
    )
  } },
]
</script>

<template>
  <div>
    <t-table
      row-key="name"
      :data="items"
      :columns="columns"
      height="75vh"
    />
    <DialogDeleteBlobs v-model:visible="visiblePopConfirmDelete" :data="selectedItems" />
  </div>
</template>
