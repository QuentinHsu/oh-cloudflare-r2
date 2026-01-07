<script setup lang="ts">
  import type { DropdownMenuTriggerProps } from 'reka-ui';
  import { useForwardProps } from 'reka-ui';

  const props = defineProps<DropdownMenuTriggerProps>();

  const _forwardedProps = useForwardProps(props);
</script>

<template>
  <DropdownMenuTrigger class="outline-none" v-bind="forwardedProps">
    <slot />
  </DropdownMenuTrigger>
</template>
