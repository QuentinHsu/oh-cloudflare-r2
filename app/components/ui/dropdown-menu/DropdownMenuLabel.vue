<script setup lang="ts">
  import { reactiveOmit } from '@vueuse/core';
  import type { DropdownMenuLabelProps } from 'reka-ui';
  import { useForwardProps } from 'reka-ui';
  import type { HTMLAttributes } from 'vue';

  const props = defineProps<DropdownMenuLabelProps & { class?: HTMLAttributes['class']; inset?: boolean }>();

  const delegatedProps = reactiveOmit(props, 'class');

  const _forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
  <DropdownMenuLabel
    v-bind="forwardedProps"
    :class="cn('px-2 py-1.5 text-sm font-semibold', inset && 'pl-8', props.class)"
  >
    <slot />
  </DropdownMenuLabel>
</template>
