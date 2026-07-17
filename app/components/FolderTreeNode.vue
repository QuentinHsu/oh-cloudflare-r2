<script setup lang="ts">
import { ChevronRight, Folder } from "@lucide/vue";
import type { FolderNode } from "./file-manager/types";

const props = defineProps<{
  node: FolderNode;
  selected: string;
  expanded: string[];
  depth?: number;
}>();

const emit = defineEmits<{
  select: [path: string];
  toggle: [path: string];
}>();

const depth = props.depth ?? 0;
const isExpanded = computed(() => props.expanded.includes(props.node.path));
const isSelected = computed(() => props.selected === props.node.path);
const hasChildren = computed(() => props.node.children.length > 0);
</script>

<template>
  <div>
    <div
      class="flex min-w-0 items-center rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      :class="{ 'bg-sidebar-accent text-sidebar-accent-foreground': isSelected }"
      :style="{ paddingLeft: `${depth * 12 + 8}px` }"
    >
      <button
        v-if="hasChildren"
        type="button"
        class="flex size-11 shrink-0 items-center justify-center rounded-md md:size-7"
        :data-toggle-path="node.path"
        :aria-label="node.name"
        :aria-expanded="isExpanded"
        @click="emit('toggle', node.path)"
      >
        <ChevronRight
          class="size-3.5 text-muted-foreground transition-transform"
          :class="{ 'rotate-90': isExpanded }"
        />
      </button>
      <span v-else class="w-11 shrink-0 md:w-7" />
      <button
        type="button"
        class="flex h-11 min-w-0 flex-1 items-center gap-2 pr-2 text-left text-sm md:h-8"
        :data-folder-path="node.path"
        :aria-current="isSelected ? 'page' : undefined"
        @click="emit('select', node.path)"
      >
        <Folder class="size-4 shrink-0 text-muted-foreground" />
        <span class="truncate">{{ node.name }}</span>
      </button>
    </div>

    <template v-if="hasChildren && isExpanded">
      <FolderTreeNode
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :selected="selected"
        :expanded="expanded"
        :depth="depth + 1"
        @select="emit('select', $event)"
        @toggle="emit('toggle', $event)"
      />
    </template>
  </div>
</template>
