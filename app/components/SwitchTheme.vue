<script setup lang="ts">
  const colorMode = useColorMode();

  function toggleTheme() {
    colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark';
  }
</script>

<template>
  <t-button variant="text" shape="circle" @click="toggleTheme">
    <template #icon>
      <Icon :name="colorMode.value === 'dark' ? 'material-symbols:light-mode' : 'material-symbols:dark-mode'" />
    </template>
  </t-button>
</template>
