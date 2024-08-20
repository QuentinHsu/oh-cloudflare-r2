<script setup>
import { useHead } from 'nuxt/app'

useHead({
  title: 'Dashboard',
  meta: [
    {
      name: 'description',
      content: 'Dashboard page',
    },
  ],
})
</script>

<template>
  <t-layout class="app-dashboard">
    <Header />
    <t-layout>
      <!-- aside start -->
      <DashboardAside />
      <!-- aside end -->

      <!-- content start -->
      <DashboardContent />
      <!-- content end -->
    </t-layout>
    <t-footer>Footer</t-footer>
  </t-layout>
</template>

<style lang="scss" scoped>
.app-dashboard {
  height: 100vh;
}
</style>
