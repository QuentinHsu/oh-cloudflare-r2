<script setup lang="ts">
  import type { SelectLabelProps } from 'reka-ui';
  import type { HTMLAttributes } from 'vue';

  const _props = defineProps<SelectLabelProps & { class?: HTMLAttributes['class'] }>();
</script>

<template>
  <SelectLabel :class="cn('py-1.5 pl-8 pr-2 text-sm font-semibold', props.class)">
    <slot />
  </SelectLabel>
</template>
