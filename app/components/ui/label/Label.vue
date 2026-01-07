<script setup lang="ts">
  import { reactiveOmit } from '@vueuse/core';
  import type { LabelProps } from 'reka-ui';
  import type { HTMLAttributes } from 'vue';

  const props = defineProps<LabelProps & { class?: HTMLAttributes['class'] }>();

  const _delegatedProps = reactiveOmit(props, 'class');
</script>

<template>
  <Label
    v-bind="delegatedProps"
    :class="
      cn(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        props.class,
      )
    "
  >
    <slot />
  </Label>
</template>
