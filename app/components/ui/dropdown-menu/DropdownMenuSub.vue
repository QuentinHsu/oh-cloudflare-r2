<script setup lang="ts">
  import type { DropdownMenuSubEmits, DropdownMenuSubProps } from 'reka-ui';
  import { useForwardPropsEmits } from 'reka-ui';

  const props = defineProps<DropdownMenuSubProps>();
  const emits = defineEmits<DropdownMenuSubEmits>();

  const _forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
  <DropdownMenuSub v-bind="forwarded">
    <slot />
  </DropdownMenuSub>
</template>
