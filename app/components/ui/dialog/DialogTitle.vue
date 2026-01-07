<script setup lang="ts">
  import { reactiveOmit } from '@vueuse/core';
  import type { DialogTitleProps } from 'reka-ui';
  import { useForwardProps } from 'reka-ui';
  import type { HTMLAttributes } from 'vue';

  const props = defineProps<DialogTitleProps & { class?: HTMLAttributes['class'] }>();

  const delegatedProps = reactiveOmit(props, 'class');

  const _forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
  <DialogTitle
    v-bind="forwardedProps"
    :class="
      cn(
        'text-lg font-semibold leading-none tracking-tight',
        props.class,
      )
    "
  >
    <slot />
  </DialogTitle>
</template>
