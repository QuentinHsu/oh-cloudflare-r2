<script setup lang="ts">
import { ArrowDown, ArrowUp, Search, X } from "@lucide/vue";
import { computed } from "vue";
import type { SortDirection, SortField } from "../../composables/file-manager/useFileView";

const props = defineProps<{
  searchQuery: string;
  sortField: SortField;
  sortDirection: SortDirection;
  hasActiveSearch: boolean;
  resultCount: number;
}>();

const emit = defineEmits<{
  (event: "update:search-query", value: string): void;
  (event: "update:sort-field", value: SortField): void;
  (event: "toggle-sort-direction"): void;
  (event: "clear-search"): void;
}>();

const directionAction = computed(() =>
  props.sortDirection === "asc" ? "切换为降序" : "切换为升序",
);

function handleSearchUpdate(value: string | number): void {
  emit("update:search-query", String(value));
}

function handleSortFieldUpdate(value: unknown): void {
  if (value !== "name" && value !== "uploadedAt" && value !== "size") {
    return;
  }

  emit("update:sort-field", value);
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
    <div class="relative basis-full sm:min-w-64 sm:flex-1 sm:basis-auto">
      <Search
        aria-hidden="true"
        class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        :model-value="props.searchQuery"
        aria-label="搜索当前文件夹"
        placeholder="搜索当前文件夹"
        class="pl-9 pr-9"
        @update:model-value="handleSearchUpdate"
      />
      <Button
        v-if="props.hasActiveSearch"
        type="button"
        variant="ghost"
        size="icon"
        class="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
        aria-label="清除搜索"
        title="清除搜索"
        @click="emit('clear-search')"
      >
        <X aria-hidden="true" class="h-4 w-4" />
      </Button>
    </div>

    <Select :model-value="props.sortField" @update:model-value="handleSortFieldUpdate">
      <SelectTrigger class="min-w-36 flex-1 sm:w-36 sm:flex-none" aria-label="排序字段">
        <SelectValue placeholder="排序方式" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="name">名称</SelectItem>
        <SelectItem value="uploadedAt">更新时间</SelectItem>
        <SelectItem value="size">大小</SelectItem>
      </SelectContent>
    </Select>

    <Button
      type="button"
      variant="outline"
      size="icon"
      :aria-label="directionAction"
      :title="directionAction"
      @click="emit('toggle-sort-direction')"
    >
      <ArrowUp v-if="props.sortDirection === 'asc'" aria-hidden="true" class="h-4 w-4" />
      <ArrowDown v-else aria-hidden="true" class="h-4 w-4" />
    </Button>

    <p
      v-if="props.hasActiveSearch"
      class="text-sm text-muted-foreground"
      aria-live="polite"
      aria-atomic="true"
    >
      找到 {{ props.resultCount }} 项
    </p>
  </div>
</template>
