<script setup lang="ts">
  import type { DialogCloseProps } from 'reka-ui';

  const _props = defineProps<DialogCloseProps>();
</script>

<template>
  <DialogClose v-bind="props">
    <slot />
  </DialogClose>
</template>
