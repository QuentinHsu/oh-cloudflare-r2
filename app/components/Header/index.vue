<script setup lang="ts"></script>

<template>
  <t-header class="header">
    <h1>Oh Cloudflare R2</h1>
    <SwitchTheme class="switch-theme" />
  </t-header>
</template>

<style lang="scss" scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 10px;
  h1 {
    font-size: 1rem;
    font-weight: bold;
  }
  .switch-theme {
    width: 40px;
  }
}
</style>
