<script setup lang="ts">
import type { RequestMethodResponse, UploadFile } from 'tdesign-vue-next'
import { useStoreFileManager } from '~/stores/useStoreFileManager'
import { useStoreLogin } from '~/stores/useStoreLogin'

const storeFileManager = useStoreFileManager()

const currentPath = ref<string>('')
async function onUpload(files: UploadFile): Promise<RequestMethodResponse> {
  files = toRaw(files[0])
  const prefix = currentPath.value
  const storeLogin = useStoreLogin()
  const upload = useUpload(`/api/blob?prefix=${prefix}`, { method: 'PUT', headers: {
    Authorization: `Bearer ${storeLogin.token || ''}`,
  } })
  if (Array.isArray(files)) {
    // Handle the case when files is an array

  }
  else {
    if (files) {
      const response = await upload(files.raw as File)
      return { status: 'success', response: { url: `/images/${response.pathname}` } }
    }
  }
  return { status: 'fail', error: '上传失败', response: { url: undefined } }
}
function init() {
  currentPath.value = storeFileManager.currentPath
}
onMounted(() => {
  init()
})
</script>

<template>
  <div class="upload__basic">
    <div class="upload__basic__content">
      <t-form label-align="top">
        <t-form-item label="Upload path" name="uploadPath">
          <t-input v-model="currentPath" placeholder="Please enter the upload path" />
        </t-form-item>
        <t-form-item label="Upload files" name="uploadFiles">
          <t-upload
            theme="file-flow"
            :request-method="onUpload" :auto-upload="false" :upload-button="undefined" :cancel-upload-button="{ theme: 'default', content: '取消上传' }" multiple :max="8" tips="支持粘贴上传"
          />
        </t-form-item>
      </t-form>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.upload__basic {
  width: 100%;
  &__content {
    width: 100%;
    .t-upload {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
      :deep(.t-upload__flow) {
        width: 100%;
      }
      .t-upload__flow-image-flow {
        width: 100%;
      }
    }
  }
}
</style>
