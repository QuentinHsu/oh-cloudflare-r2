<script setup lang="ts">
import { Toaster } from '~/components/ui/sonner'

useSeoMeta({
  title: 'R2 Dashboard',
  description: '现代化的 Cloudflare R2 文件管理面板',
})

const colorMode = useColorMode()
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <Toaster :theme="colorMode.value as 'light' | 'dark'" position="top-center" />
</template>
