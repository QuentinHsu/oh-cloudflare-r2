<script setup lang="ts">
import { Home, FolderOpen } from 'lucide-vue-next'
import type { FolderNode } from './types'

const props = defineProps<{
  open: boolean
  count: number
  folderTree: FolderNode[]
  expandedFolders: string[]
  targetPath: string
  isBatchMoving: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'update:targetPath', value: string): void
  (e: 'toggle-folder', path: string): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

function onOpenChange(value: boolean) {
  emit('update:open', value)
}

function onPathInput(event: Event) {
  emit('update:targetPath', (event.target as HTMLInputElement).value)
}
</script>

<template>
  <Dialog :open="props.open" @update:open="onOpenChange">
    <DialogContent class="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>批量移动 {{ props.count }} 个文件</DialogTitle>
      </DialogHeader>

      <div class="space-y-3 py-2">
        <div class="flex items-center gap-2 px-3 py-2.5 bg-muted/50 rounded-lg border">
          <FolderOpen class="h-4 w-4 text-muted-foreground shrink-0" />
          <span class="text-muted-foreground">/</span>
          <input
            :value="props.targetPath"
            type="text"
            class="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            placeholder="输入目标路径或留空移动到根目录"
            @input="onPathInput"
          />
        </div>

        <div v-if="props.folderTree.length" class="max-h-40 overflow-y-auto rounded-lg border bg-muted/30 p-2">
          <div
            class="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted text-sm"
            :class="{ 'bg-muted': props.targetPath === '' }"
            @click="emit('update:targetPath', '')"
          >
            <Home class="h-3.5 w-3.5 text-muted-foreground" />
            <span>根目录</span>
          </div>
          <FolderTreeNode
            v-for="node in props.folderTree"
            :key="node.path"
            :node="node"
            :selected="props.targetPath"
            :expanded="props.expandedFolders"
            @select="emit('update:targetPath', $event)"
            @toggle="emit('toggle-folder', $event)"
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" size="sm" @click="emit('cancel')">取消</Button>
        <Button size="sm" @click="emit('confirm')" :disabled="props.isBatchMoving">
          {{ props.isBatchMoving ? '移动中...' : '移动' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
