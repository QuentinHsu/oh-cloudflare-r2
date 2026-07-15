<script setup lang="ts">
import { Folder, ChevronRight } from "lucide-vue-next";

interface FolderNode {
  name: string;
  path: string;
  children: FolderNode[];
}

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
      class="flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer hover:bg-muted text-sm"
      :class="{ 'bg-muted': isSelected }"
      :style="{ paddingLeft: `${depth * 12 + 8}px` }"
      @click="emit('select', node.path)"
    >
      <button
        v-if="hasChildren"
        type="button"
        class="p-0.5 hover:bg-muted-foreground/20 rounded"
        @click.stop="emit('toggle', node.path)"
      >
        <ChevronRight
          class="h-3 w-3 text-muted-foreground transition-transform"
          :class="{ 'rotate-90': isExpanded }"
        />
      </button>
      <span v-else class="w-4" />
      <Folder class="h-3.5 w-3.5 text-blue-500" />
      <span class="truncate">{{ node.name }}</span>
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
