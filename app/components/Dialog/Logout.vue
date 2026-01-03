<script setup lang="ts">
interface Props {
  visible: boolean
}
const props = defineProps<Props>()
const emit = defineEmits<{
  "update:visible": [boolean]
}>()

const localVisible = ref(false)
const router = useRouter()
const storeLogin = useStoreLogin()

function onConfirm() {
  storeLogin.logout()
  localVisible.value = false
  router.push("/")
}

watch(() => props.visible, (v) => { localVisible.value = v })
watch(localVisible, (v) => { emit("update:visible", v) })
</script>

<template>
  <t-dialog
    v-model:visible="localVisible"
    header="退出登录"
    width="400px"
    placement="center"
    confirm-btn="确认退出"
    cancel-btn="取消"
    :on-confirm="onConfirm"
  >
    <p class="text-slate-600 dark:text-slate-400">确定要退出登录吗？</p>
  </t-dialog>
</template>
