<script setup lang="ts">
import { ref, watch } from 'vue'
import type { IFileItem } from '../Dashboard/Content/Content/ResourceView/Icon.vue'
import { postDeleteBlob, postDeleteFolder } from '~/server/blob'
import { useStoreFileManager } from '~/stores/useStoreFileManager'

interface IProps {
  visible: boolean
  data: IFileItem[]
}
const props = defineProps<IProps>()
const emit = defineEmits<{
  'update:visible': [boolean]
}>()

const localVisible = ref(false)
const storeFileManger = useStoreFileManager()
const dialogHeader = computed(() => {
  if (props.data[0]?.type === 'folder') {
    return 'Delete Folder'
  }
  else {
    return 'Delete File'
  }
})

function onClose() {

}

async function onConfirm() {
  try {
    if (props.data.length === 0) {
      return MessagePlugin.error('Please select at least one file')
    }
    if (props.data.length > 1) {
      return MessagePlugin.error('Only one file can be deleted at a time')
    }
    if (props.data[0]?.type === 'folder') {
      await postDeleteFolder(props.data[0].path)
    }
    if (props.data[0]?.type === 'file') {
      await postDeleteBlob([props.data[0].path])
    }
    await storeFileManger.fetchCurrentPathData(storeFileManger.currentPath)
    MessagePlugin.success('Delete successful')
    localVisible.value = false
  }
  catch (error: any) {
    console.error(error)
    MessagePlugin.error(error.message)
  }
}

onMounted(() => {
  localVisible.value = props.visible
})

watch(() => props.visible, (newValue) => {
  localVisible.value = newValue
})

watch(localVisible, (newValue) => {
  emit('update:visible', newValue)
})
</script>

<template>
  <ClientOnly>
    <t-dialog
      v-model:visible="localVisible"
      placement="center"
      :header="dialogHeader"
      width="40%"
      :close-on-overlay-click="false"
      :on-confirm="onConfirm"
      cancel-btn="Cancel"
      confirm-btn="Delete"
      @close="onClose"
    >
      <t-space v-if="localVisible" direction="vertical" class="w-full">
        <div>
          Are you sure you want to delete this?
        </div>
      </t-space>
    </t-dialog>
  </ClientOnly>
</template>
