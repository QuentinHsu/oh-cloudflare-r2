<script setup lang="ts">
  import type { DropdownMenuRadioGroupEmits, DropdownMenuRadioGroupProps } from 'reka-ui';
  import { useForwardPropsEmits } from 'reka-ui';

  const props = defineProps<DropdownMenuRadioGroupProps>();
  const emits = defineEmits<DropdownMenuRadioGroupEmits>();

  const _forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
  <DropdownMenuRadioGroup v-bind="forwarded">
    <slot />
  </DropdownMenuRadioGroup>
</template>
