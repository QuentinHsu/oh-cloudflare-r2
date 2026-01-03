<script setup lang="ts">
const fileManagerStore = useStoreFileManager()
const { currentPath } = storeToRefs(fileManagerStore)

const pathSegments = computed(() => currentPath.value.split("/").filter(Boolean))

const getPathUpTo = (index: number): string => `${pathSegments.value.slice(0, index + 1).join("/")}/`

function navigateUp(path: string): void {
  fileManagerStore.navigateUp(path)
}

onMounted(() => {
  fileManagerStore.fetchCurrentPathData("")
})
</script>

<template>
  <nav class="flex items-center gap-1 text-sm">
    <button
      class="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-accent transition-colors"
      :class="currentPath === '' ? 'text-foreground font-medium' : 'text-muted-foreground'"
      @click="navigateUp('')"
    >
      <Icon name="ph:house-simple" class="text-sm" />
      <span>根目录</span>
    </button>

    <template v-for="(segment, index) in pathSegments" :key="index">
      <Icon name="ph:caret-right" class="text-muted-foreground/50 text-xs" />
      <button
        class="px-2 py-1 rounded-md hover:bg-accent transition-colors max-w-40 truncate"
        :class="index === pathSegments.length - 1 ? 'text-foreground font-medium' : 'text-muted-foreground'"
        @click="navigateUp(getPathUpTo(index))"
      >
        {{ segment }}
      </button>
    </template>
  </nav>
</template>
