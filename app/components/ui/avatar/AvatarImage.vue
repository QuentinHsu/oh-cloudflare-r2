<script setup lang="ts">
  import type { AvatarImageProps } from 'reka-ui';

  const _props = defineProps<AvatarImageProps>();
</script>

<template>
  <AvatarImage v-bind="props" class="h-full w-full object-cover">
    <slot />
  </AvatarImage>
</template>
