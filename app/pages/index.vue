<script setup>
  useHead({
    meta: [{ content: 'Oh Cloudflare R2, manage your Cloudflare R2 Blob Storage', name: 'description' }],
    title: 'Oh Cloudflare R2',
  });
</script>

<template>
  <t-layout class="h-100vh w-100vw overflow-hidden">
    <AppHeader />
    <div class="p-4 h-full">
      <HomeContent />
    </div>
    <AppFooter />
  </t-layout>
</template>
