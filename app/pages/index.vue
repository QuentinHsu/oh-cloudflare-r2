<script setup>
useHead({
  title: 'Oh Cloudflare R2',
  meta: [
    {
      name: 'description',
      content: 'Oh Cloudflare R2, manage your Cloudflare R2 Blob Storage',
    },
  ],
})
</script>

<template>
  <t-layout class="app-index h-100vh w-100vw overflow-hidden">
    <Header />
    <div class="p-4 h-full">
      <HomeContent />
    </div>
    <FooterBasic />
  </t-layout>
</template>
