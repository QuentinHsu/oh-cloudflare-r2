<script setup lang="ts">
import { Toaster } from "~/components/ui/sonner";

const { t } = useI18n();

useSeoMeta({
  title: () => t("app.name"),
  description: () => t("app.description"),
});

const colorMode = useColorMode();
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <Toaster :theme="colorMode.value as 'light' | 'dark'" position="top-center" />
</template>
