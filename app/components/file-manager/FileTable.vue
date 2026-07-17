<script setup lang="ts">
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  File as FileIcon,
  Folder,
  Image,
  Link,
  MoreHorizontal,
  Move,
  Pencil,
  Search,
  Trash2,
  X,
} from "@lucide/vue";
import { computed } from "vue";
import type { SortDirection, SortField } from "../../composables/file-manager/useFileView";
import type { BlobFile, CopyUrlPayload } from "./types";
import { getFileName } from "./utils";

const props = defineProps<{
  folders: string[];
  files: BlobFile[];
  selectedFiles: Set<string>;
  allSelected: boolean;
  searchQuery: string;
  sortField: SortField;
  sortDirection: SortDirection;
  hasActiveSearch: boolean;
  resultCount: number;
  formatSize: (bytes: number) => string;
  formatDate: (value: string) => string;
  formatFileType: (file: BlobFile) => string;
}>();

const emit = defineEmits<{
  "update:search-query": [value: string];
  "update:sort-field": [value: SortField];
  "toggle-sort-direction": [];
  "clear-search": [];
  "navigate-folder": [folder: string];
  "toggle-select-all": [];
  "toggle-file": [pathname: string];
  "open-preview": [file: BlobFile];
  "copy-url": [payload: CopyUrlPayload];
  rename: [file: BlobFile];
  move: [file: BlobFile];
  delete: [pathname: string];
}>();

const { t } = useI18n();
const directionAction = computed(() =>
  props.sortDirection === "asc" ? t("files.sort.descending") : t("files.sort.ascending"),
);

function isImage(file: BlobFile): boolean {
  return file.contentType.startsWith("image/");
}

function updateSearch(value: string | number) {
  emit("update:search-query", String(value));
}

function updateSortField(value: unknown) {
  if (value === "name" || value === "uploadedAt" || value === "size") {
    emit("update:sort-field", value);
  }
}
</script>

<template>
  <Card class="overflow-hidden">
    <div class="flex flex-wrap items-center gap-2 border-b p-3">
      <div class="relative min-w-0 basis-full sm:max-w-sm sm:flex-1 sm:basis-auto">
        <Search
          class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          :model-value="props.searchQuery"
          :aria-label="t('files.search')"
          :placeholder="t('files.search')"
          class="h-11 pl-9 pr-10 md:h-9"
          @update:model-value="updateSearch"
        />
        <Button
          v-if="props.hasActiveSearch"
          variant="ghost"
          size="icon"
          class="absolute right-0 top-1/2 size-11 -translate-y-1/2 md:size-9"
          :aria-label="t('files.clearSearch')"
          @click="emit('clear-search')"
        >
          <X class="size-4" />
        </Button>
      </div>

      <Select :model-value="props.sortField" @update:model-value="updateSortField">
        <SelectTrigger class="h-11 w-36 md:h-9" :aria-label="t('files.sort.field')">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="name">{{ t("files.sort.name") }}</SelectItem>
          <SelectItem value="uploadedAt">{{ t("files.sort.uploadedAt") }}</SelectItem>
          <SelectItem value="size">{{ t("files.sort.size") }}</SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="icon"
        class="size-11 md:size-9"
        :aria-label="directionAction"
        @click="emit('toggle-sort-direction')"
      >
        <ArrowUp v-if="props.sortDirection === 'asc'" class="size-4" />
        <ArrowDown v-else class="size-4" />
      </Button>

      <span v-if="props.hasActiveSearch" class="ml-auto text-sm text-muted-foreground">
        {{ t("files.results", { count: props.resultCount }) }}
      </span>
    </div>

    <div class="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="w-12">
              <Checkbox
                :model-value="props.allSelected"
                :disabled="!props.files.length"
                :aria-label="t('files.selected', { count: props.selectedFiles.size })"
                @update:model-value="emit('toggle-select-all')"
              />
            </TableHead>
            <TableHead data-column="name">{{ t("files.columns.name") }}</TableHead>
            <TableHead data-column="type">{{ t("files.columns.type") }}</TableHead>
            <TableHead data-column="size" class="hidden sm:table-cell">
              {{ t("files.columns.size") }}
            </TableHead>
            <TableHead data-column="updatedAt" class="hidden md:table-cell">
              {{ t("files.columns.updatedAt") }}
            </TableHead>
            <TableHead class="w-14" />
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="folder in props.folders"
            :key="`folder:${folder}`"
            :data-folder-row="folder"
          >
            <TableCell />
            <TableCell data-column="name">
              <button
                type="button"
                :data-folder="folder"
                class="flex min-h-11 w-full min-w-0 items-center gap-2 text-left font-medium hover:underline md:min-h-8"
                @click="emit('navigate-folder', folder)"
              >
                <Folder class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span class="truncate">{{ folder }}</span>
              </button>
            </TableCell>
            <TableCell data-column="type" class="text-muted-foreground">
              {{ t("stats.folders") }}
            </TableCell>
            <TableCell data-column="size" class="hidden text-muted-foreground sm:table-cell">
              —
            </TableCell>
            <TableCell data-column="updatedAt" class="hidden text-muted-foreground md:table-cell">
              —
            </TableCell>
            <TableCell>
              <ChevronRight class="ml-auto size-4 text-muted-foreground" aria-hidden="true" />
            </TableCell>
          </TableRow>

          <TableRow
            v-for="file in props.files"
            :key="file.pathname"
            :data-file="file.pathname"
            :data-selected="props.selectedFiles.has(file.pathname) || undefined"
          >
            <TableCell>
              <Checkbox
                :model-value="props.selectedFiles.has(file.pathname)"
                :aria-label="getFileName(file.pathname)"
                @update:model-value="emit('toggle-file', file.pathname)"
              />
            </TableCell>
            <TableCell data-column="name">
              <button
                v-if="isImage(file)"
                type="button"
                class="flex min-h-11 min-w-0 items-center gap-2 text-left font-medium hover:underline md:min-h-8"
                @click="emit('open-preview', file)"
              >
                <Image class="size-4 shrink-0 text-muted-foreground" />
                <span class="truncate">{{ getFileName(file.pathname) }}</span>
              </button>
              <div v-else class="flex min-h-11 min-w-0 items-center gap-2 font-medium md:min-h-8">
                <FileIcon class="size-4 shrink-0 text-muted-foreground" />
                <span class="truncate">{{ getFileName(file.pathname) }}</span>
              </div>
            </TableCell>
            <TableCell data-column="type" class="text-muted-foreground">
              {{ props.formatFileType(file) }}
            </TableCell>
            <TableCell data-column="size" class="hidden sm:table-cell">
              {{ props.formatSize(file.size) }}
            </TableCell>
            <TableCell data-column="updatedAt" class="hidden text-muted-foreground md:table-cell">
              {{ props.formatDate(file.uploadedAt) }}
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <Button
                    variant="ghost"
                    size="icon"
                    class="size-11 md:size-9"
                    :aria-label="t('files.actions.menu', { name: getFileName(file.pathname) })"
                  >
                    <MoreHorizontal class="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    v-if="isImage(file)"
                    data-action="preview"
                    @click="emit('open-preview', file)"
                  >
                    <Image class="size-4" />
                    {{ t("files.actions.preview") }}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    data-action="copy-raw"
                    @click="emit('copy-url', { pathname: file.pathname, type: 'raw' })"
                  >
                    <Link class="size-4" />
                    {{ t("files.actions.copyRaw") }}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    v-if="isImage(file)"
                    data-action="copy-markdown"
                    @click="emit('copy-url', { pathname: file.pathname, type: 'markdown' })"
                  >
                    <Image class="size-4" />
                    {{ t("files.actions.copyMarkdown") }}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem data-action="rename" @click="emit('rename', file)">
                    <Pencil class="size-4" />
                    {{ t("files.actions.rename") }}
                  </DropdownMenuItem>
                  <DropdownMenuItem data-action="move" @click="emit('move', file)">
                    <Move class="size-4" />
                    {{ t("files.actions.move") }}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    data-action="delete"
                    class="text-destructive focus:text-destructive"
                    @click="emit('delete', file.pathname)"
                  >
                    <Trash2 class="size-4" />
                    {{ t("files.actions.delete") }}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </Card>
</template>
