<script setup lang="ts">
const props = defineProps<{
  open: boolean;
  fileName?: string;
  isDeleting: boolean;
}>();

const emit = defineEmits<{
  "update:open": [open: boolean];
  confirm: [];
  cancel: [];
}>();

const { t } = useI18n();
</script>

<template>
  <AlertDialog :open="props.open" @update:open="emit('update:open', $event)">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ t("dialogs.delete.title") }}</AlertDialogTitle>
        <AlertDialogDescription>
          {{ t("dialogs.delete.description", { name: props.fileName ?? "" }) }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel data-action="cancel-delete" @click="emit('cancel')">
          {{ t("dialogs.cancel") }}
        </AlertDialogCancel>
        <AlertDialogAction
          data-action="confirm-delete"
          class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          :disabled="props.isDeleting"
          @click="emit('confirm')"
        >
          {{ props.isDeleting ? t("dialogs.delete.working") : t("dialogs.delete.confirm") }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
