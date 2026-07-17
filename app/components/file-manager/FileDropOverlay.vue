<script setup lang="ts">
import { UploadCloud } from "@lucide/vue";

const { t } = useI18n();
</script>

<template>
  <div
    role="status"
    aria-live="polite"
    aria-atomic="true"
    class="pointer-events-none absolute inset-0 z-[60] flex items-center justify-center rounded-lg border-2 border-dashed border-primary/60 bg-background/90 p-6 backdrop-blur-sm"
  >
    <div class="flex max-w-sm flex-col items-center gap-3 text-center">
      <div class="rounded-full bg-primary/10 p-3 text-primary">
        <UploadCloud aria-hidden="true" class="h-7 w-7" />
      </div>
      <div>
        <p class="font-medium">{{ t("upload.dropTitle") }}</p>
        <p class="mt-1 text-sm text-muted-foreground">{{ t("upload.dropDescription") }}</p>
      </div>
    </div>
  </div>
</template>
