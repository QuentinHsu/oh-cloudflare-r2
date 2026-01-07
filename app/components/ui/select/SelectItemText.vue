<script setup lang="ts">
  import type { SelectItemTextProps } from 'reka-ui';

  const _props = defineProps<SelectItemTextProps>();
</script>

<template>
  <SelectItemText v-bind="props">
    <slot />
  </SelectItemText>
</template>
