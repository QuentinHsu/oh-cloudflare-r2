<script setup lang="ts">
  import type { AvatarFallbackProps } from 'reka-ui';

  const _props = defineProps<AvatarFallbackProps>();
</script>

<template>
  <AvatarFallback v-bind="props">
    <slot />
  </AvatarFallback>
</template>
