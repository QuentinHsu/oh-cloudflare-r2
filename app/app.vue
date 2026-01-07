<script setup lang="ts">
  import { useColorMode, useSeoMeta } from '#imports';

  useSeoMeta({
    description: '现代化的 Cloudflare R2 文件管理面板',
    title: 'R2 Dashboard',
  });

  const _colorMode = useColorMode();
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <Toaster :theme="_colorMode.value as 'light' | 'dark'" position="top-center" />
</template>
