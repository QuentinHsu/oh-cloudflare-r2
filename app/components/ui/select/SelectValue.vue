<script setup lang="ts">
  import type { SelectValueProps } from 'reka-ui';

  const _props = defineProps<SelectValueProps>();
</script>

<template>
  <SelectValue v-bind="props">
    <slot />
  </SelectValue>
</template>
