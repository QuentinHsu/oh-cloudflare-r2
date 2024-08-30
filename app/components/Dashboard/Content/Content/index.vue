<script setup lang="ts">
import { useStoreFileManager } from '~/stores/useStoreFileManager'
import { useStoreGlobal } from '~/stores/useStoreGlobal'

const visibleDialogUpload = ref(false)

const { setLoadingFullScreen } = useStoreGlobal()
const storeFileManage = useStoreFileManager()
function onClickUpload() {
  visibleDialogUpload.value = true
}
async function onClickRefresh() {
  try {
    setLoadingFullScreen(true)
    storeFileManage.fetchCurrentPathData(storeFileManage.currentPath)
  }
  catch (error) {
    console.error(error)
  }
  finally {
    setTimeout(() => {
      setLoadingFullScreen(false)
    }, 500)
  }
}
async function init() {
  await onClickRefresh()
}
onMounted(async () => {
  await init()
})
</script>

<template>
  <div class="dashboard-content__content">
    <div class="flex space-x-3">
      <t-popup content="upload">
        <t-button variant="outline" shape="square" @click="onClickUpload">
          <Icon name="typcn:upload" class="text-5" />
        </t-button>
      </t-popup>
      <t-popup content="refresh">
        <t-button variant="outline" shape="square" @click="onClickRefresh">
          <Icon name="typcn:refresh" class="text-5" />
        </t-button>
      </t-popup>
      <DialogUpload v-model:visible="visibleDialogUpload" />
    </div>
    <DashboardContentContentResourceView class="mt-5" />
  </div>
</template>

<style lang="scss" scoped>

</style>
