<script setup>
import 'tdesign-vue-next/dist/reset.css'
import { useStoreGlobal } from './stores/useStoreGlobal'

const storeGlobal = useStoreGlobal()
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtLoadingIndicator />
  <NuxtPage />
  <t-loading :loading="storeGlobal.loadingFullScreen.status" :text="storeGlobal.loadingFullScreen.text" fullscreen />
</template>

<style>
/* .page-enter-active,
.page-leave-active {
  transition: all 0.3s;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
  filter: blur(1rem);
} */
</style>
