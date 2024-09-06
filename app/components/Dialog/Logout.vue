<script setup lang="ts">
import { ref, watch } from 'vue'
import { useStoreLogin } from '~/stores/useStoreLogin'

interface IProps {
  visible: boolean
}
const props = defineProps<IProps>()
const emit = defineEmits<{
  'update:visible': [boolean]
}>()

const localVisible = ref(false)
const router = useRouter()
const storeLogin = useStoreLogin()

function onClose() {

}

async function onConfirm() {
  try {
    localVisible.value = false
    storeLogin.logout()
    router.push('/')
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
      header="Logout"
      width="40%"
      :close-on-overlay-click="false"
      :on-confirm="onConfirm"
      cancel-btn="Cancel"
      confirm-btn="Logout"
      @close="onClose"
    >
      <t-space v-if="localVisible" direction="vertical" class="w-full">
        <div>
          Are you sure you want to logout?
        </div>
      </t-space>
    </t-dialog>
  </ClientOnly>
</template>
