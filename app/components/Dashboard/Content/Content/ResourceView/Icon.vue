<script setup lang="ts">
import { computed } from 'vue'
import { useStoreFileManager } from '~/stores/useStoreFileManager'

const fileManagerStore = useStoreFileManager()
const { blobs, folders } = storeToRefs(fileManagerStore)

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
  return extension.charAt(0).toUpperCase() + extension.slice(1)
}
</script>

<template>
  <div class="w-full">
    <table class="w-full border-collapse">
      <thead class="">
        <tr class="w-full">
          <th class="p-2 text-left w-50%">
            Name
          </th>
          <th class="p-2 text-left w-15%">
            Type
          </th>
          <th class="p-2 text-left w-15%">
            Size
          </th>
          <th class="p-2 text-left w-20%">
            Actions
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.path" class="border-gray-200 ">
          <td class="p-2">
            <div class="flex items-center cursor-pointer" @click="item.type === 'folder' && navigateToFolder(item.path)">
              <Icon :name="getIconName(item.type, getLastPathSegment(item.path))" class="text-6 mr-2" />
              <span>{{ getLastPathSegment(item.path) }}</span>
            </div>
          </td>
          <td class="p-2">
            {{ getFileType(item.type, getLastPathSegment(item.path)) }}
          </td>
          <td class="p-2">
            {{ formatSize(item.size) }}
          </td>
          <td class="p-2">
            {{ item.type === 'folder' ? '' : 'Download' }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
