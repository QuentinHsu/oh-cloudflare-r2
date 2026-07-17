<script setup lang="ts">
import { Link, Image } from "@lucide/vue";

const props = defineProps<{
  open: boolean;
  fileName?: string;
  src?: string;
}>();

const emit = defineEmits<{
  (e: "update:open", value: boolean): void;
  (e: "copy-raw"): void;
  (e: "copy-markdown"): void;
}>();

const { t } = useI18n();

function onOpenChange(value: boolean) {
  emit("update:open", value);
}
</script>

<template>
  <Dialog :open="props.open" @update:open="onOpenChange">
    <DialogContent class="max-w-4xl">
      <DialogHeader>
        <DialogTitle>{{ t("dialogs.preview.title", { name: props.fileName ?? "" }) }}</DialogTitle>
      </DialogHeader>
      <div class="flex justify-center overflow-hidden rounded-md bg-muted/40">
        <img
          v-if="props.src"
          :src="props.src"
          :alt="props.fileName ?? ''"
          class="max-h-[65vh] object-contain"
        />
      </div>
      <DialogFooter>
        <Button variant="outline" class="min-h-11 md:min-h-9" @click="emit('copy-raw')">
          <Link class="size-4" aria-hidden="true" />
          {{ t("dialogs.preview.copyRaw") }}
        </Button>
        <Button variant="outline" class="min-h-11 md:min-h-9" @click="emit('copy-markdown')">
          <Image class="size-4" aria-hidden="true" />
          {{ t("dialogs.preview.copyMarkdown") }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
