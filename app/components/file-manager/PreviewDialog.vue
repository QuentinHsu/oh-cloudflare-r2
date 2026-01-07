<script setup lang="ts">
import { Link, Image } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
  fileName?: string
  src?: string
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'copy-raw'): void
  (e: 'copy-markdown'): void
}>()

function onOpenChange(value: boolean) {
  emit('update:open', value)
}
</script>

<template>
  <Dialog :open="props.open" @update:open="onOpenChange">
    <DialogContent class="max-w-4xl">
      <DialogHeader>
        <DialogTitle>{{ props.fileName }}</DialogTitle>
      </DialogHeader>
      <div class="flex justify-center">
        <img v-if="props.src" :src="props.src" class="max-h-[70vh] object-contain rounded" />
      </div>
      <DialogFooter>
        <Button variant="outline" @click="emit('copy-raw')">
          <Link class="mr-2 h-4 w-4" />
          复制链接
        </Button>
        <Button variant="outline" @click="emit('copy-markdown')">
          <Image class="mr-2 h-4 w-4" />
          复制 Markdown
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
