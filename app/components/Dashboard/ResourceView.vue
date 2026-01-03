<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

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
  if (type === "folder") return "ph:folder-simple-fill"
  const ext = getFileExt(path)
  const map: Record<string, string> = {
    jpg: "ph:image", jpeg: "ph:image", png: "ph:image", gif: "ph:image", webp: "ph:image", svg: "ph:image",
    mp4: "ph:video", mov: "ph:video", avi: "ph:video",
    mp3: "ph:music-note", wav: "ph:music-note",
    pdf: "ph:file-pdf", doc: "ph:file-doc", docx: "ph:file-doc", txt: "ph:file-text",
    zip: "ph:file-zip", rar: "ph:file-zip",
    json: "ph:file-code", js: "ph:file-code", ts: "ph:file-code", html: "ph:file-code", css: "ph:file-code",
  }
  return map[ext] || "ph:file"
}

function getIconColor(type: string, path: string): string {
  if (type === "folder") return "text-primary"
  const ext = getFileExt(path)
  const map: Record<string, string> = {
    jpg: "text-green-500", jpeg: "text-green-500", png: "text-green-500", gif: "text-green-500", webp: "text-green-500", svg: "text-green-500",
    mp4: "text-purple-500", mov: "text-purple-500",
    pdf: "text-red-500",
    zip: "text-yellow-500", rar: "text-yellow-500",
  }
  return map[ext] || "text-muted-foreground"
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
}

function onClickCopyMarkdown(item: IFileItem) {
  const url = `${window.location.origin}/images/${item.path}`
  const md = `![${getFileName(item.path)}](${url})`
  navigator.clipboard.writeText(md)
}
</script>

<template>
  <TooltipProvider>
    <div>
      <!-- Empty State -->
      <div v-if="items.length === 0" class="flex flex-col items-center justify-center py-20">
        <div class="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
          <Icon name="ph:folder-simple-dashed" class="text-2xl text-muted-foreground" />
        </div>
        <p class="text-foreground text-sm mb-1">此文件夹为空</p>
        <p class="text-muted-foreground text-xs">上传文件开始使用</p>
      </div>

      <!-- Table View -->
      <div v-else class="bg-card border border-border rounded-lg overflow-hidden">
        <!-- Table Header -->
        <div class="grid grid-cols-12 gap-4 px-4 py-2.5 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <div class="col-span-6">名称</div>
          <div class="col-span-2">类型</div>
          <div class="col-span-2">大小</div>
          <div class="col-span-2 text-right">操作</div>
        </div>

        <!-- Table Body -->
        <div class="divide-y divide-border">
          <div
            v-for="item in items"
            :key="item.path"
            class="group grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-muted/50 cursor-pointer transition-colors"
            @click="onClickItem(item)"
          >
            <!-- Name -->
            <div class="col-span-6 flex items-center gap-3 min-w-0">
              <Icon :name="getIconName(item.type, item.path)" :class="['text-lg flex-shrink-0', getIconColor(item.type, item.path)]" />
              <span class="text-sm text-foreground truncate">{{ getFileName(item.path) }}</span>
            </div>

            <!-- Type -->
            <div class="col-span-2 text-sm text-muted-foreground">
              {{ item.type === "folder" ? "文件夹" : getFileExt(item.path).toUpperCase() || "文件" }}
            </div>

            <!-- Size -->
            <div class="col-span-2 text-sm text-muted-foreground">
              {{ item.type === "folder" ? "-" : formatSize(item.size) }}
            </div>

            <!-- Actions -->
            <div class="col-span-2 flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" @click.stop>
              <template v-if="item.type === 'file'">
                <Tooltip>
                  <TooltipTrigger as-child>
                    <Button variant="ghost" size="icon" class="h-8 w-8" @click="onClickCopy(item)">
                      <Icon name="ph:link-simple" class="text-sm text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>复制链接</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger as-child>
                    <Button variant="ghost" size="icon" class="h-8 w-8" @click="onClickCopyMarkdown(item)">
                      <Icon name="ph:markdown-logo" class="text-sm text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>复制 Markdown</TooltipContent>
                </Tooltip>
              </template>
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button variant="ghost" size="icon" class="h-8 w-8 hover:text-destructive" @click="onClickDelete(item)">
                    <Icon name="ph:trash-simple" class="text-sm" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>删除</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

      <DialogDeleteBlobs v-model:visible="visibleDelete" :data="selectedItem ? [selectedItem] : []" />
    </div>
  </TooltipProvider>
</template>
