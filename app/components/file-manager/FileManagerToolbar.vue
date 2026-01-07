<script setup lang="ts">
import { ref } from 'vue'
import { Home, ChevronRight, Upload, Trash2, Move, CheckSquare, Square } from 'lucide-vue-next'

const props = defineProps<{
  pathParts: string[]
  isSelectionMode: boolean
  hasSelection: boolean
  selectedCount: number
  isBatchMoving: boolean
  isBatchDeleting: boolean
  isUploading: boolean
}>()

const emit = defineEmits<{
  (e: 'navigate', index: number): void
  (e: 'toggle-selection'): void
  (e: 'open-batch-move'): void
  (e: 'batch-delete'): void
  (e: 'files-selected', files: FileList): void
}>()

const fileInputRef = ref<HTMLInputElement | null>(null)

function triggerUpload() {
  fileInputRef.value?.click()
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files?.length) {
    emit('files-selected', input.files)
  }
  if (input) input.value = ''
}
</script>

<template>
  <div class="flex items-center justify-between">
    <!-- 面包屑导航 -->
    <div class="flex items-center gap-1 text-sm">
      <Button variant="ghost" size="sm" class="h-8 px-2" @click="emit('navigate', -1)">
        <Home class="h-4 w-4" />
      </Button>
      <template v-for="(part, index) in props.pathParts" :key="index">
        <ChevronRight class="h-4 w-4 text-muted-foreground" />
        <Button variant="ghost" size="sm" class="h-8 px-2" @click="emit('navigate', index)">
          {{ part }}
        </Button>
      </template>
    </div>

    <!-- 操作按钮 -->
    <div class="flex items-center gap-2">
      <template v-if="props.isSelectionMode && props.hasSelection">
        <Button size="sm" variant="outline" @click="emit('open-batch-move')" :disabled="props.isBatchMoving">
          <Move class="mr-2 h-4 w-4" />
          移动 ({{ props.selectedCount }})
        </Button>
        <Button size="sm" variant="destructive" @click="emit('batch-delete')" :disabled="props.isBatchDeleting">
          <Trash2 class="mr-2 h-4 w-4" />
          删除 ({{ props.selectedCount }})
        </Button>
      </template>
      <Button size="sm" variant="outline" @click="emit('toggle-selection')">
        <CheckSquare v-if="props.isSelectionMode" class="mr-2 h-4 w-4" />
        <Square v-else class="mr-2 h-4 w-4" />
        {{ props.isSelectionMode ? '取消选择' : '批量操作' }}
      </Button>
      <Button size="sm" :disabled="props.isUploading" @click="triggerUpload">
        <Upload class="mr-2 h-4 w-4" />
        上传文件
      </Button>
      <input
        ref="fileInputRef"
        type="file"
        multiple
        accept="image/*"
        class="hidden"
        @change="handleFileChange"
      />
    </div>
  </div>
</template>
