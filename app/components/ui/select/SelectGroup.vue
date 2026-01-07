<script setup lang="ts">
  import { reactiveOmit } from '@vueuse/core';
  import type { SelectGroupProps } from 'reka-ui';
  import type { HTMLAttributes } from 'vue';

  const props = defineProps<SelectGroupProps & { class?: HTMLAttributes['class'] }>();

  const _delegatedProps = reactiveOmit(props, 'class');
</script>

<template>
  <SelectGroup :class="cn('p-1 w-full', props.class)" v-bind="delegatedProps">
    <slot />
  </SelectGroup>
</template>
