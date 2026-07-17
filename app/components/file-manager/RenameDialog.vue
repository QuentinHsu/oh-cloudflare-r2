<script setup lang="ts">
import { nextTick, ref, watch } from "vue";

type InputComponent = { $el: HTMLInputElement };

const props = defineProps<{
  open: boolean;
  currentName?: string;
  newFileName: string;
  isRenaming: boolean;
}>();

const { t } = useI18n();

const emit = defineEmits<{
  (e: "update:open", value: boolean): void;
  (e: "update:newFileName", value: string): void;
  (e: "confirm"): void;
  (e: "cancel"): void;
}>();

const inputRef = ref<InputComponent | null>(null);

function getInputEl(): HTMLInputElement | null {
  return inputRef.value?.$el ?? null;
}

watch(
  () => props.open,
  (open) => {
    if (!open) return;

    const defaultName = props.currentName ?? "";
    if (props.newFileName !== defaultName) {
      emit("update:newFileName", defaultName);
    }

    nextTick(() => {
      const input = getInputEl();
      if (!input) return;
      input.focus();
      const name = props.newFileName || defaultName;
      const dotIndex = name.lastIndexOf(".");
      if (dotIndex > 0) {
        input.setSelectionRange(0, dotIndex);
      } else {
        input.select();
      }
    });
  },
);

function onOpenChange(value: boolean) {
  emit("update:open", value);
}
</script>

<template>
  <Dialog :open="props.open" @update:open="onOpenChange">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ t("dialogs.rename.title") }}</DialogTitle>
      </DialogHeader>

      <div class="space-y-4 py-2">
        <div class="text-sm text-muted-foreground">
          <span class="font-medium">{{ t("dialogs.rename.current") }}：</span>
          {{ props.currentName }}
        </div>

        <div class="space-y-2">
          <Label for="rename-input">{{ t("dialogs.rename.next") }}</Label>
          <Input
            id="rename-input"
            ref="inputRef"
            :model-value="props.newFileName"
            :placeholder="t('dialogs.rename.placeholder')"
            @update:model-value="emit('update:newFileName', $event as string)"
            @keyup.enter="emit('confirm')"
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" class="min-h-11 md:min-h-9" @click="emit('cancel')">
          {{ t("dialogs.cancel") }}
        </Button>
        <Button
          class="min-h-11 md:min-h-9"
          @click="emit('confirm')"
          :disabled="props.isRenaming || !props.newFileName.trim()"
        >
          {{ props.isRenaming ? t("dialogs.rename.working") : t("dialogs.rename.confirm") }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
