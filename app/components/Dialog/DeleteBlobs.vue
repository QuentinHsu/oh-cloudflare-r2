<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { IFileItem } from '../Dashboard/ResourceView.vue'

interface Props {
  visible: boolean
  data: IFileItem[]
}
const props = defineProps<Props>()
const emit = defineEmits<{
  "update:visible": [boolean]
}>()

const localVisible = computed({
  get: () => props.visible,
  set: (v) => emit("update:visible", v)
})
const loading = ref(false)
const storeFileManager = useStoreFileManager()

const itemName = computed(() => {
  if (!props.data[0]) return ""
  const path = props.data[0].path.replace(/\/+$/, "")
  return path.split("/").pop() || ""
})

const isFolder = computed(() => props.data[0]?.type === "folder")

async function onConfirm() {
  if (!props.data[0]) return

  loading.value = true
  try {
    if (isFolder.value) {
      await postDeleteFolder(props.data[0].path)
    } else {
      await postDeleteBlob([props.data[0].path])
    }
    await storeFileManager.fetchCurrentPathData(storeFileManager.currentPath)
    localVisible.value = false
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AlertDialog v-model:open="localVisible">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ isFolder ? '删除文件夹' : '删除文件' }}</AlertDialogTitle>
        <AlertDialogDescription>
          确定要删除 <span class="font-medium text-foreground">{{ itemName }}</span> 吗？
          <span v-if="isFolder" class="block mt-1 text-destructive">此操作将删除文件夹内的所有文件，且无法恢复。</span>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>取消</AlertDialogCancel>
        <AlertDialogAction class="bg-destructive text-destructive-foreground hover:bg-destructive/90" :disabled="loading" @click="onConfirm">
          <Icon v-if="loading" name="ph:spinner" class="mr-2 animate-spin" />
          删除
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
