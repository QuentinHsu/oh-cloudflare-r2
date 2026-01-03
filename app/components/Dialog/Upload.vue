<script setup lang="ts">
import type { RequestMethodResponse, UploadFile } from "tdesign-vue-next"

interface Props {
  visible: boolean
}
const props = defineProps<Props>()
const emit = defineEmits<{
  "update:visible": [boolean]
}>()

const localVisible = ref(false)
const storeFileManager = useStoreFileManager()
const uploadPath = ref("")

function onOpen() {
  uploadPath.value = storeFileManager.currentPath
}

function onClose() {
  storeFileManager.fetchCurrentPathData(storeFileManager.currentPath)
}

async function onUpload(files: UploadFile): Promise<RequestMethodResponse> {
  const file = toRaw(files[0])
  const storeLogin = useStoreLogin()
  const upload = useUpload(`/api/blob?prefix=${uploadPath.value}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${storeLogin.token || ""}` },
  })

  if (!Array.isArray(file) && file) {
    const response = await upload(file.raw as File)
    return { status: "success", response: { url: `/images/${response.pathname}` } }
  }
  return { status: "fail", error: "上传失败", response: { url: undefined } }
}

watch(() => props.visible, (v) => {
  localVisible.value = v
  if (v) onOpen()
})
watch(localVisible, (v) => { emit("update:visible", v) })
</script>

<template>
  <t-dialog
    v-model:visible="localVisible"
    :header="false"
    :footer="false"
    width="560px"
    placement="center"
    @close="onClose"
  >
    <div class="py-4">
      <div class="mb-6">
        <h2 class="text-xl font-semibold text-slate-800 dark:text-white">上传文件</h2>
        <p class="text-sm text-slate-500 mt-1">支持拖拽或粘贴上传，最多 8 个文件</p>
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">上传路径</label>
          <t-input v-model="uploadPath" placeholder="留空则上传到根目录" clearable>
            <template #prefix-icon>
              <Icon name="material-symbols:folder-outline" />
            </template>
          </t-input>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">选择文件</label>
          <t-upload
            theme="file-flow"
            :request-method="onUpload"
            :auto-upload="false"
            :upload-button="undefined"
            :cancel-upload-button="{ theme: 'default', content: '取消' }"
            multiple
            :max="8"
            tips="支持拖拽或粘贴上传"
          />
        </div>
      </div>
    </div>
  </t-dialog>
</template>
