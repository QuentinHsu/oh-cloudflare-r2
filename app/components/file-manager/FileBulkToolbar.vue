<script setup lang="ts">
import { Move, Trash2, X } from "@lucide/vue";

const props = defineProps<{
  selectedCount: number;
  isMoving: boolean;
  isDeleting: boolean;
}>();

const emit = defineEmits<{
  move: [];
  delete: [];
  clear: [];
}>();

const { t } = useI18n();
</script>

<template>
  <div
    v-if="props.selectedCount > 0"
    data-bulk-toolbar
    class="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-2"
  >
    <Badge variant="secondary" class="mr-auto">
      {{ t("files.selected", { count: props.selectedCount }) }}
    </Badge>
    <Button
      variant="outline"
      class="min-h-11 md:min-h-9"
      data-action="move"
      :disabled="props.isMoving || props.isDeleting"
      @click="emit('move')"
    >
      <Move class="size-4" />
      {{ props.isMoving ? t("dialogs.batchMove.working") : t("files.actions.move") }}
    </Button>
    <Button
      variant="destructive"
      class="min-h-11 md:min-h-9"
      data-action="delete"
      :disabled="props.isMoving || props.isDeleting"
      @click="emit('delete')"
    >
      <Trash2 class="size-4" />
      {{ props.isDeleting ? t("dialogs.batchDelete.working") : t("files.actions.delete") }}
    </Button>
    <Button
      variant="ghost"
      size="icon"
      class="size-11 md:size-9"
      data-action="clear"
      :aria-label="t('files.actions.clearSelection')"
      @click="emit('clear')"
    >
      <X class="size-4" />
    </Button>
  </div>
</template>
