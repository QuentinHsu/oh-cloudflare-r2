<script setup lang="ts">
const props = defineProps<{
  open: boolean;
  count: number;
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
        <AlertDialogTitle>{{
          t("dialogs.batchDelete.title", { count: props.count })
        }}</AlertDialogTitle>
        <AlertDialogDescription>
          {{ t("dialogs.batchDelete.description") }}
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
          {{
            props.isDeleting ? t("dialogs.batchDelete.working") : t("dialogs.batchDelete.confirm")
          }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
