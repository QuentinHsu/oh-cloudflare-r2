<script setup lang="ts">
  import type { DialogRootEmits, DialogRootProps } from 'reka-ui';
  import { useForwardPropsEmits } from 'reka-ui';

  const props = defineProps<DialogRootProps>();
  const emits = defineEmits<DialogRootEmits>();

  const _forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
  <DialogRoot v-bind="forwarded">
    <slot />
  </DialogRoot>
</template>
