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
  <t-layout class="app-index">
    <Header />
    <t-layout class="app-index-content">
      <HomeContent />
    </t-layout>
    <t-footer>Footer</t-footer>
  </t-layout>
</template>

<style lang="scss" scoped>
.app-index {
  min-height: 100vh;
  &-content {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
  }
}
</style>
