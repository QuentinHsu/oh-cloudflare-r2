<script setup lang="ts">
import { GitFork as Github, HardDrive } from "@lucide/vue";
import { computed } from "vue";

definePageMeta({
  layout: false,
});

const route = useRoute();
const { t } = useI18n();
const error = route.query.error;
const errorMessage = computed(() =>
  error === "unauthorized" ? t("auth.unauthorized") : t("auth.failed"),
);
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-background px-4 py-10">
    <Card class="w-full max-w-md shadow-sm">
      <CardHeader class="space-y-2 text-center">
        <div
          class="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground"
        >
          <HardDrive class="size-6" aria-hidden="true" />
        </div>
        <CardTitle class="text-2xl">{{ t("auth.title") }}</CardTitle>
        <CardDescription>{{ t("auth.description") }}</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div
          v-if="error"
          role="alert"
          class="rounded-lg bg-destructive/10 p-3 text-center text-sm text-destructive"
        >
          {{ errorMessage }}
        </div>
        <Button as-child class="min-h-11 w-full" size="lg">
          <a href="/api/auth/github">
            <Github class="size-5" aria-hidden="true" />
            {{ t("auth.github") }}
          </a>
        </Button>
      </CardContent>
    </Card>
  </main>
</template>
