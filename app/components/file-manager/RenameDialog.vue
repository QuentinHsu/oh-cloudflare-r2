<script setup lang="ts">
const props = defineProps<{
  open: boolean;
  currentName?: string;
  newFileName: string;
  isRenaming: boolean;
}>();

const emit = defineEmits<{
  (e: "update:open", value: boolean): void;
  (e: "update:newFileName", value: string): void;
  (e: "confirm"): void;
  (e: "cancel"): void;
}>();

const inputRef = ref<HTMLInputElement | null>(null);

function getInputEl() {
  const target = inputRef.value as any;
  return (target?.$el ?? target) as HTMLInputElement | null;
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
        <DialogTitle>重命名文件</DialogTitle>
      </DialogHeader>

      <div class="space-y-4 py-2">
        <div class="text-sm text-muted-foreground">
          <span class="font-medium">原文件名：</span>
          {{ props.currentName }}
        </div>

        <div class="space-y-2">
          <Label for="rename-input">新文件名</Label>
          <Input
            id="rename-input"
            ref="inputRef"
            :model-value="props.newFileName"
            placeholder="输入新文件名"
            @update:model-value="emit('update:newFileName', $event as string)"
            @keyup.enter="emit('confirm')"
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" size="sm" @click="emit('cancel')">取消</Button>
        <Button
          size="sm"
          @click="emit('confirm')"
          :disabled="props.isRenaming || !props.newFileName.trim()"
        >
          {{ props.isRenaming ? "重命名中..." : "确认" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
