<script setup lang="ts">
const fileManagerStore = useStoreFileManager()
const { blobs, folders } = storeToRefs(fileManagerStore)

export interface IFileItem {
  type: "folder" | "file"
  path: string
  size?: number | null
}

const items = computed(() => [
  ...folders.value.map((folder) => ({ type: "folder" as const, path: folder, size: null })),
  ...blobs.value.map((blob) => ({ type: "file" as const, path: blob.pathname, size: blob.size })),
])

const selectedItem = ref<IFileItem | null>(null)
const visibleDelete = ref(false)

function navigateToFolder(folder: string) {
  fileManagerStore.navigateToFolder(folder)
}

function formatSize(size: number | null): string {
  if (size === null) return "-"
  const units = ["B", "KB", "MB", "GB", "TB"]
  let i = 0
  let s = size
  while (s >= 1024 && i < units.length - 1) {
    s /= 1024
    i++
  }
  return `${s.toFixed(1)} ${units[i]}`
}

function getFileName(path: string): string {
  return path.replace(/\/+$/, "").split("/").pop() || ""
}

function getFileExt(path: string): string {
  const name = getFileName(path)
  const ext = name.match(/\.([^.]+)$/)?.[1]?.toLowerCase()
  return ext || ""
}

function getIconName(type: string, path: string): string {
  if (type === "folder") return "flat-color-icons:folder"
  const ext = getFileExt(path)
  const map: Record<string, string> = {
    jpg: "flat-color-icons:image-file",
    jpeg: "flat-color-icons:image-file",
    png: "flat-color-icons:image-file",
    gif: "flat-color-icons:image-file",
    webp: "flat-color-icons:image-file",
    svg: "flat-color-icons:image-file",
    mp4: "flat-color-icons:video-file",
    mov: "flat-color-icons:video-file",
    avi: "flat-color-icons:video-file",
    mp3: "flat-color-icons:audio-file",
    wav: "flat-color-icons:audio-file",
    pdf: "flat-color-icons:document",
    doc: "flat-color-icons:document",
    docx: "flat-color-icons:document",
    txt: "flat-color-icons:document",
  }
  return map[ext] || "flat-color-icons:file"
}

function onClickItem(item: IFileItem) {
  if (item.type === "folder") {
    navigateToFolder(item.path)
  }
}

function onClickDelete(item: IFileItem) {
  selectedItem.value = item
  visibleDelete.value = true
}

function onClickCopy(item: IFileItem) {
  const url = `${window.location.origin}/images/${item.path}`
  navigator.clipboard.writeText(url)
  MessagePlugin.success("链接已复制")
}

function onClickCopyMarkdown(item: IFileItem) {
  const url = `${window.location.origin}/images/${item.path}`
  const md = `![${getFileName(item.path)}](${url})`
  navigator.clipboard.writeText(md)
  MessagePlugin.success("Markdown 已复制")
}
</script>

<template>
  <div>
    <!-- Empty State -->
    <div v-if="items.length === 0" class="flex flex-col items-center justify-center py-20 text-slate-400">
      <Icon name="material-symbols:folder-off-outline" class="text-6xl mb-4" />
      <p>暂无文件</p>
    </div>

    <!-- File Grid -->
    <div v-else class="grid grid-cols-1 gap-2">
      <div
        v-for="item in items"
        :key="item.path"
        class="group flex items-center gap-4 px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm transition-all cursor-pointer"
        @click="onClickItem(item)"
      >
        <!-- Icon -->
        <div class="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
          <Icon :name="getIconName(item.type, item.path)" class="text-2xl" />
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="font-medium text-slate-800 dark:text-white truncate">
            {{ getFileName(item.path) }}
          </div>
          <div class="text-xs text-slate-500 mt-0.5">
            {{ item.type === "folder" ? "文件夹" : formatSize(item.size) }}
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" @click.stop>
          <template v-if="item.type === 'file'">
            <t-tooltip content="复制链接">
              <t-button variant="text" shape="square" size="small" @click="onClickCopy(item)">
                <Icon name="material-symbols:link" class="text-lg" />
              </t-button>
            </t-tooltip>
            <t-tooltip content="复制 Markdown">
              <t-button variant="text" shape="square" size="small" @click="onClickCopyMarkdown(item)">
                <Icon name="material-symbols:markdown" class="text-lg" />
              </t-button>
            </t-tooltip>
          </template>
          <t-tooltip content="删除">
            <t-button variant="text" shape="square" size="small" theme="danger" @click="onClickDelete(item)">
              <Icon name="material-symbols:delete-outline" class="text-lg" />
            </t-button>
          </t-tooltip>
        </div>
      </div>
    </div>

    <DialogDeleteBlobs v-model:visible="visibleDelete" :data="selectedItem ? [selectedItem] : []" />
  </div>
</template>
