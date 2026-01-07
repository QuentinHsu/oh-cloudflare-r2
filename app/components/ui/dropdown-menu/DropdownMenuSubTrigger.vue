<script setup lang="ts">
  import { reactiveOmit } from '@vueuse/core';
  import type { DropdownMenuSubTriggerProps } from 'reka-ui';
  import { useForwardProps } from 'reka-ui';
  import type { HTMLAttributes } from 'vue';

  const props = defineProps<DropdownMenuSubTriggerProps & { class?: HTMLAttributes['class'] }>();

  const delegatedProps = reactiveOmit(props, 'class');

  const _forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
  <DropdownMenuSubTrigger
    v-bind="forwardedProps"
    :class="cn(
      'flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent',
      props.class,
    )"
  >
    <slot />
    <ChevronRight class="ml-auto h-4 w-4" />
  </DropdownMenuSubTrigger>
</template>
