<script setup lang="ts">
import { Button } from '@/components/ui/button'

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === "dark")

function toggle() {
  colorMode.preference = isDark.value ? "light" : "dark"
}
</script>

<template>
  <Button variant="ghost" size="icon" class="h-8 w-8" @click="toggle">
    <Icon :name="isDark ? 'ph:sun' : 'ph:moon'" class="text-base text-muted-foreground" />
  </Button>
</template>
