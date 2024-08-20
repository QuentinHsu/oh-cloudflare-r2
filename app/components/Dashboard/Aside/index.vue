<script setup lang="ts"></script>

<template>
  <t-aside class="aside">
    <div class="action">
      <t-button>Upload</t-button>
    </div>
  </t-aside>
</template>

<style lang="scss" scoped>
.aside {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  .action {
    width: 100%;
    margin-bottom: 10px;
    .t-button {
      width: 100%;
    }
  }
}
</style>
