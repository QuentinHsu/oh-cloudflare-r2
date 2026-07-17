<script setup lang="ts">
import { Clock3, File as FileIcon, Folder, HardDrive } from "@lucide/vue";
import type { DirectorySummary } from "../../composables/file-manager/useFilePresentation";
import { getFileName } from "./utils";

const props = defineProps<{
  summary: DirectorySummary;
  formatSize: (bytes: number) => string;
  formatRelativeTime: (value: string) => string;
}>();

const { t } = useI18n();
</script>

<template>
  <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Directory summary">
    <Card data-stat-card="files">
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-sm font-medium">{{ t("stats.files") }}</CardTitle>
        <FileIcon class="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p class="text-2xl font-semibold tracking-tight">{{ props.summary.fileCount }}</p>
        <Badge variant="secondary" class="mt-2 font-normal">
          {{ t("stats.images", { count: props.summary.imageCount }) }}
        </Badge>
      </CardContent>
    </Card>

    <Card data-stat-card="storage">
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-sm font-medium">{{ t("stats.storage") }}</CardTitle>
        <HardDrive class="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p class="text-2xl font-semibold tracking-tight">
          {{ props.formatSize(props.summary.totalSize) }}
        </p>
      </CardContent>
    </Card>

    <Card data-stat-card="folders">
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-sm font-medium">{{ t("stats.folders") }}</CardTitle>
        <Folder class="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p class="text-2xl font-semibold tracking-tight">{{ props.summary.folderCount }}</p>
      </CardContent>
    </Card>

    <Card data-stat-card="latest">
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-sm font-medium">{{ t("stats.latest") }}</CardTitle>
        <Clock3 class="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <template v-if="props.summary.latestFile">
          <p class="truncate text-base font-semibold">
            {{ getFileName(props.summary.latestFile.pathname) }}
          </p>
          <p class="mt-1 text-sm text-muted-foreground">
            {{ props.formatRelativeTime(props.summary.latestFile.uploadedAt) }}
          </p>
        </template>
        <p v-else class="text-sm text-muted-foreground">{{ t("stats.never") }}</p>
      </CardContent>
    </Card>
  </section>
</template>
