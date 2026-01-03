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
  <div class="flex items-center gap-2 text-sm">
    <button
      class="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      :class="currentPath === '' ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-500 dark:text-slate-400'"
      @click="navigateUp('')"
    >
      <Icon name="material-symbols:home-outline" class="text-lg" />
      <span>根目录</span>
    </button>

    <template v-for="(segment, index) in pathSegments" :key="index">
      <Icon name="material-symbols:chevron-right" class="text-slate-400" />
      <button
        class="px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        :class="index === pathSegments.length - 1 ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-500 dark:text-slate-400'"
        @click="navigateUp(getPathUpTo(index))"
      >
        {{ segment }}
      </button>
    </template>
  </div>
</template>
