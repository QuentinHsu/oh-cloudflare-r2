<script setup lang="ts">
  import type { DropdownMenuGroupProps } from 'reka-ui';

  const _props = defineProps<DropdownMenuGroupProps>();
</script>

<template>
  <DropdownMenuGroup v-bind="props">
    <slot />
  </DropdownMenuGroup>
</template>
