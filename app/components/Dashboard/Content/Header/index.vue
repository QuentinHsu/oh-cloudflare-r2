<script setup lang="ts"></script>

<template>
  <div class="dashboard-content__header">
    <DashboardContentHeaderBreadcrumb />
    <t-button>Upload</t-button>
  </div>
</template>

<style lang="scss" scoped>
.dashboard-content__header {
  padding: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;

  .t-button {
    width: 100px;
  }
}
</style>
