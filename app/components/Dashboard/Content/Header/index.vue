<script setup lang="ts">
const visibleDialogUpload = ref(false)
function onClick() {
  visibleDialogUpload.value = true
}
</script>

<template>
  <div class="dashboard-content__header">
    <DashboardContentHeaderBreadcrumb />
    <t-button @click="onClick">
      Upload
    </t-button>
  </div>
  <DialogUpload v-model:visible="visibleDialogUpload" />
</template>

<style lang="scss" scoped>
.dashboard-content__header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .t-button {
    width: 100px;
  }
}
</style>
