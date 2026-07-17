<script setup lang="ts">
import { Home, FolderOpen } from "@lucide/vue";
import type { FolderNode } from "./types";

const props = defineProps<{
  open: boolean;
  pendingCount: number;
  uploadPath: string;
  folderTree: FolderNode[];
  expandedFolders: string[];
  isUploading: boolean;
}>();

const emit = defineEmits<{
  (e: "update:open", value: boolean): void;
  (e: "update:uploadPath", value: string): void;
  (e: "toggle-folder", path: string): void;
  (e: "select-folder", path: string): void;
  (e: "confirm"): void;
  (e: "cancel"): void;
}>();

const { t } = useI18n();

function onOpenChange(value: boolean) {
  emit("update:open", value);
}

function onPathInput(event: Event) {
  emit("update:uploadPath", (event.target as HTMLInputElement).value);
}
</script>

<template>
  <Dialog :open="props.open" @update:open="onOpenChange">
    <DialogContent class="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>{{ t("upload.title", { count: props.pendingCount || 0 }) }}</DialogTitle>
        <DialogDescription>{{ t("upload.target") }}</DialogDescription>
      </DialogHeader>

      <div class="space-y-3 py-2">
        <div class="flex items-center gap-2 px-3 py-2.5 bg-muted/50 rounded-lg border">
          <FolderOpen class="h-4 w-4 text-muted-foreground shrink-0" />
          <span class="text-muted-foreground">/</span>
          <input
            :value="props.uploadPath"
            type="text"
            class="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            :placeholder="t('upload.pathPlaceholder')"
            @input="onPathInput"
          />
        </div>

        <div
          v-if="props.folderTree.length"
          class="max-h-40 overflow-y-auto rounded-lg border bg-muted/30 p-2"
        >
          <div
            class="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted text-sm"
            :class="{ 'bg-muted': props.uploadPath === '' }"
            @click="emit('select-folder', '')"
          >
            <Home class="h-3.5 w-3.5 text-muted-foreground" />
            <span>{{ t("sidebar.root") }}</span>
          </div>
          <FolderTreeNode
            v-for="node in props.folderTree"
            :key="node.path"
            :node="node"
            :selected="props.uploadPath"
            :expanded="props.expandedFolders"
            @select="emit('select-folder', $event)"
            @toggle="emit('toggle-folder', $event)"
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" size="sm" @click="emit('cancel')">
          {{ t("upload.cancel") }}
        </Button>
        <Button size="sm" @click="emit('confirm')" :disabled="props.isUploading">
          {{ props.isUploading ? t("upload.uploading") : t("upload.confirm") }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
