<script setup lang="ts">
import type { IFileItem } from "../Dashboard/ResourceView.vue"

interface Props {
  visible: boolean
  data: IFileItem[]
}
const props = defineProps<Props>()
const emit = defineEmits<{
  "update:visible": [boolean]
}>()

const localVisible = ref(false)
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
    MessagePlugin.success("删除成功")
    localVisible.value = false
  } catch {
    MessagePlugin.error("删除失败")
  } finally {
    loading.value = false
  }
}

watch(() => props.visible, (v) => { localVisible.value = v })
watch(localVisible, (v) => { emit("update:visible", v) })
</script>

<template>
  <t-dialog
    v-model:visible="localVisible"
    :header="isFolder ? '删除文件夹' : '删除文件'"
    width="400px"
    placement="center"
    confirm-btn="确认删除"
    cancel-btn="取消"
    :confirm-loading="loading"
    :on-confirm="onConfirm"
  >
    <p class="text-slate-600 dark:text-slate-400">
      确定要删除 <span class="font-medium text-slate-800 dark:text-white">{{ itemName }}</span> 吗？
      <template v-if="isFolder">
        <br><span class="text-red-500 text-sm">此操作将删除文件夹内的所有文件</span>
      </template>
    </p>
  </t-dialog>
</template>
