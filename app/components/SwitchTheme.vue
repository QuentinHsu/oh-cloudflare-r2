<script setup lang="ts">
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === "dark")

function toggle() {
  colorMode.preference = isDark.value ? "light" : "dark"
}
</script>

<template>
  <button
    class="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
    @click="toggle"
  >
    <Icon :name="isDark ? 'material-symbols:light-mode-outline' : 'material-symbols:dark-mode-outline'" class="text-xl" />
  </button>
</template>
