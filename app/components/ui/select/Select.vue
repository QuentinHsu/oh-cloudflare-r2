<script setup lang="ts">
  import type { SelectRootEmits, SelectRootProps } from 'reka-ui';
  import { useForwardPropsEmits } from 'reka-ui';

  const props = defineProps<SelectRootProps>();
  const emits = defineEmits<SelectRootEmits>();

  const _forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
  <SelectRoot v-bind="forwarded">
    <slot />
  </SelectRoot>
</template>
