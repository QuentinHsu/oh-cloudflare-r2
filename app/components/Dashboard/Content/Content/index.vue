<script setup lang="ts">
const visibleDialogUpload = ref(false)
function onClick() {
  visibleDialogUpload.value = true
}
</script>

<template>
  <div class="dashboard-content__content">
    <div>
      <t-button @click="onClick">
        Upload
      </t-button>
      <DialogUpload v-model:visible="visibleDialogUpload" />
    </div>
    <DashboardContentContentResourceView />
  </div>
</template>

<style lang="scss" scoped>

</style>
