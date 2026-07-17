<script setup lang="ts">
import { AlertCircle, FolderOpen, SearchX, Upload } from "@lucide/vue";

type FilePanelState =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "empty" }
  | { kind: "no-results"; query: string; count: 0 };

const props = defineProps<{
  state: FilePanelState;
}>();

const emit = defineEmits<{
  retry: [];
  upload: [];
  "clear-search": [];
}>();

const { t } = useI18n();
</script>

<template>
  <section
    :data-state="props.state.kind"
    :aria-live="props.state.kind === 'loading' ? 'polite' : 'assertive'"
  >
    <div v-if="props.state.kind === 'loading'" class="space-y-4" aria-busy="true">
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton v-for="index in 4" :key="index" class="h-32 rounded-xl" />
      </div>
      <Skeleton class="h-80 rounded-xl" />
      <span class="sr-only">{{ t("files.states.loading") }}</span>
    </div>

    <Card v-else>
      <CardContent
        class="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center"
      >
        <template v-if="props.state.kind === 'error'">
          <AlertCircle class="mb-4 size-10 text-destructive" />
          <h2 class="text-lg font-semibold">{{ t("files.states.errorTitle") }}</h2>
          <p class="mt-2 max-w-md text-sm text-muted-foreground">
            {{ t("files.states.errorDescription") }}
          </p>
          <Button class="mt-6 min-h-11" data-action="retry" @click="emit('retry')">
            {{ t("files.states.retry") }}
          </Button>
        </template>

        <template v-else-if="props.state.kind === 'empty'">
          <FolderOpen class="mb-4 size-10 text-muted-foreground" />
          <h2 class="text-lg font-semibold">{{ t("files.states.emptyTitle") }}</h2>
          <p class="mt-2 max-w-md text-sm text-muted-foreground">
            {{ t("files.states.emptyDescription") }}
          </p>
          <Button class="mt-6 min-h-11" data-action="upload" @click="emit('upload')">
            <Upload class="size-4" />
            {{ t("sidebar.upload") }}
          </Button>
        </template>

        <template v-else>
          <SearchX class="mb-4 size-10 text-muted-foreground" />
          <h2 class="text-lg font-semibold">{{ t("files.states.noResultsTitle") }}</h2>
          <p class="mt-2 max-w-md text-sm text-muted-foreground">
            {{ t("files.states.noResultsDescription", { query: props.state.query }) }}
          </p>
          <Button
            variant="outline"
            class="mt-6 min-h-11"
            data-action="clear-search"
            @click="emit('clear-search')"
          >
            {{ t("files.clearSearch") }}
          </Button>
        </template>
      </CardContent>
    </Card>
  </section>
</template>
