<script setup lang="ts">
import type { RequestMethodResponse, UploadFile } from 'tdesign-vue-next'

async function onUpload(files: UploadFile): Promise<RequestMethodResponse> {
  // Add your upload logic here
  files = toRaw(files[0])
  const prefix = 'test/new'
  const upload = useUpload(`/api/blob?prefix=${prefix}`, { method: 'PUT', params: {

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
</script>

<template>
  <div class="upload__basic">
    <div class="upload__basic__header" />
    <div class="upload__basic__content">
      <t-upload
        theme="file-flow"
        :request-method="onUpload" :auto-upload="false" :upload-button="undefined" :cancel-upload-button="{ theme: 'default', content: '取消上传' }" multiple :max="8" tips="支持粘贴上传"
      />
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
