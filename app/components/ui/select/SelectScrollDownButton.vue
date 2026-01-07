<script setup lang="ts">
  import { reactiveOmit } from '@vueuse/core';
  import type { SelectScrollDownButtonProps } from 'reka-ui';
  import { useForwardProps } from 'reka-ui';
  import type { HTMLAttributes } from 'vue';

  const props = defineProps<SelectScrollDownButtonProps & { class?: HTMLAttributes['class'] }>();

  const delegatedProps = reactiveOmit(props, 'class');

  const _forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
  <SelectScrollDownButton v-bind="forwardedProps" :class="cn('flex cursor-default items-center justify-center py-1', props.class)">
    <slot>
      <ChevronDown class="h-4 w-4" />
    </slot>
  </SelectScrollDownButton>
</template>
