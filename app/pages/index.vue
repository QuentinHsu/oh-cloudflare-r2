<script setup lang="ts">
  definePageMeta({
    middleware: 'auth',
  });
</script>

<template>
  <div>
    <FileManager />
  </div>
</template>
