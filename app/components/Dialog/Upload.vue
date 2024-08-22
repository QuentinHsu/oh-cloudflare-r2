<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  visible: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:visible': [boolean]
}>()

const localVisible = ref(false)

function onClose() {

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
      header="上传"
      width="50%"
      :close-on-overlay-click="false"
      :footer="false"
      @close="onClose"
    >
      <t-space v-if="localVisible" direction="vertical" style="width: 100%">
        <UploadBasic style="width: 100%;" />
      </t-space>
    </t-dialog>
  </ClientOnly>
</template>
