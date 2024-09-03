<script setup>
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
  <t-layout class="app-dashboard h-100vh w-100vw">
    <Header />
    <t-layout class="flex">
      <!-- aside start -->
      <DashboardAside class="" />
      <!-- aside end -->

      <!-- content start -->
      <DashboardContent class="w-85vw" />
      <!-- content end -->
    </t-layout>
    <t-footer>Footer</t-footer>
  </t-layout>
</template>
