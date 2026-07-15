<script setup lang="ts">
import {
  Folder,
  File,
  ChevronRight,
  Link,
  Image,
  Move,
  Trash2,
  Edit,
  CheckSquare,
  Square,
} from "lucide-vue-next";
import type { BlobFile } from "./types";

const props = withDefaults(
  defineProps<{
    status?: string | null;
    folders: string[];
    files: BlobFile[];
    isSelectionMode: boolean;
    selectedFiles: Set<string>;
    allSelected: boolean;
    hasSelection: boolean;
  }>(),
  {
    status: null,
  },
);

const emit = defineEmits<{
  (e: "navigate-folder", folder: string): void;
  (e: "toggle-select-all"): void;
  (e: "toggle-file", pathname: string): void;
  (e: "open-preview", file: BlobFile): void;
  (e: "copy-url", payload: { pathname: string; type: "raw" | "markdown" }): void;
  (e: "rename", file: BlobFile): void;
  (e: "move", file: BlobFile): void;
  (e: "delete", pathname: string): void;
}>();

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function isImage(contentType: string) {
  return contentType?.startsWith("image/");
}

function getFileName(pathname: string) {
  return pathname.split("/").pop() || pathname;
}
</script>

<template>
  <Card>
    <ScrollArea class="h-[calc(100vh-220px)]">
      <div class="p-4">
        <div v-if="props.status === 'pending'" class="text-center py-8 text-muted-foreground">
          加载中...
        </div>

        <div
          v-else-if="!props.folders.length && !props.files.length"
          class="text-center py-8 text-muted-foreground"
        >
          <Folder class="mx-auto h-12 w-12 mb-2 opacity-50" />
          <p>暂无文件</p>
        </div>

        <div v-else class="space-y-1">
          <div
            v-if="props.isSelectionMode && props.files.length"
            class="flex items-center gap-3 p-3 rounded-lg bg-muted/30 mb-2"
          >
            <button @click="emit('toggle-select-all')" class="flex items-center justify-center">
              <CheckSquare v-if="props.allSelected" class="h-5 w-5 text-primary" />
              <Square v-else class="h-5 w-5 text-muted-foreground" />
            </button>
            <span class="text-sm text-muted-foreground">
              {{ props.allSelected ? "取消全选" : "全选" }}
              <span v-if="props.hasSelection">(已选 {{ props.selectedFiles.size }} 个)</span>
            </span>
          </div>

          <div
            v-for="folder in props.folders"
            :key="folder"
            class="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
            @click="emit('navigate-folder', folder)"
          >
            <Folder class="h-5 w-5 text-blue-500" />
            <span class="flex-1 font-medium">{{ folder }}</span>
            <ChevronRight
              class="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </div>

          <div
            v-for="file in props.files"
            :key="file.pathname"
            class="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
            :class="{ 'bg-primary/10': props.selectedFiles.has(file.pathname) }"
          >
            <button
              v-if="props.isSelectionMode"
              @click="emit('toggle-file', file.pathname)"
              class="flex items-center justify-center"
            >
              <CheckSquare
                v-if="props.selectedFiles.has(file.pathname)"
                class="h-5 w-5 text-primary"
              />
              <Square v-else class="h-5 w-5 text-muted-foreground" />
            </button>
            <File v-else class="h-5 w-5 text-muted-foreground flex-shrink-0" />

            <span
              class="flex-1 min-w-0 font-medium truncate"
              :class="{ 'cursor-pointer hover:text-primary': isImage(file.contentType) }"
              @click="isImage(file.contentType) && emit('open-preview', file)"
              >{{ getFileName(file.pathname) }}</span
            >
            <span class="text-sm text-muted-foreground whitespace-nowrap">{{
              formatSize(file.size)
            }}</span>
            <span class="text-sm text-muted-foreground whitespace-nowrap">{{
              formatDate(file.uploadedAt)
            }}</span>

            <div
              class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Button
                variant="ghost"
                size="icon"
                class="h-8 w-8"
                @click="emit('copy-url', { pathname: file.pathname, type: 'raw' })"
              >
                <Link class="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                class="h-8 w-8"
                @click="emit('copy-url', { pathname: file.pathname, type: 'markdown' })"
              >
                <Image class="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" class="h-8 w-8" @click="emit('rename', file)">
                <Edit class="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" class="h-8 w-8" @click="emit('move', file)">
                <Move class="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                class="h-8 w-8 text-destructive"
                @click="emit('delete', file.pathname)"
              >
                <Trash2 class="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  </Card>
</template>
