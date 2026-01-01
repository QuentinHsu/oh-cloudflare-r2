<script setup lang="ts">
  useHead({
    meta: [{ content: 'Manage your Cloudflare R2 Blob Storage', name: 'description' }],
    title: 'Oh Cloudflare R2',
  });
</script>

<template>
  <NuxtPage />
</template>

<style>
.page-enter-active,
.page-leave-active {
  transition: opacity 0.2s ease;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
}
</style>
