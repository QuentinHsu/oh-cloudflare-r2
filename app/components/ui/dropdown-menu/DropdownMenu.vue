<script setup lang="ts">
  import type { DropdownMenuRootEmits, DropdownMenuRootProps } from 'reka-ui';
  import { useForwardPropsEmits } from 'reka-ui';

  const props = defineProps<DropdownMenuRootProps>();
  const emits = defineEmits<DropdownMenuRootEmits>();

  const _forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
  <DropdownMenuRoot v-bind="forwarded">
    <slot />
  </DropdownMenuRoot>
</template>
