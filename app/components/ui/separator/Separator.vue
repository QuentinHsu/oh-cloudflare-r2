<script setup lang="ts">
  import { reactiveOmit } from '@vueuse/core';
  import type { SeparatorProps } from 'reka-ui';
  import type { HTMLAttributes } from 'vue';

  const props = withDefaults(defineProps<SeparatorProps & { class?: HTMLAttributes['class'] }>(), {
    decorative: true,
    orientation: 'horizontal',
  });

  const _delegatedProps = reactiveOmit(props, 'class');
</script>

<template>
  <Separator
    v-bind="delegatedProps"
    :class="
      cn(
        'shrink-0 bg-border',
        props.orientation === 'horizontal' ? 'h-px w-full' : 'w-px h-full',
        props.class,
      )
    "
  />
</template>
