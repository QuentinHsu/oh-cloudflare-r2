<script setup lang="ts">
  import { reactiveOmit } from '@vueuse/core';
  import type { SelectTriggerProps } from 'reka-ui';
  import { useForwardProps } from 'reka-ui';
  import type { HTMLAttributes } from 'vue';

  const props = defineProps<SelectTriggerProps & { class?: HTMLAttributes['class'] }>();

  const delegatedProps = reactiveOmit(props, 'class');

  const _forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
  <SelectTrigger
    v-bind="forwardedProps"
    :class="cn(
      'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:truncate text-start',
      props.class,
    )"
  >
    <slot />
    <SelectIcon as-child>
      <ChevronDown class="w-4 h-4 opacity-50 shrink-0" />
    </SelectIcon>
  </SelectTrigger>
</template>
