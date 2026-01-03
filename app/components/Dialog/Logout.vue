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

interface Props {
  visible: boolean
}
const props = defineProps<Props>()
const emit = defineEmits<{
  "update:visible": [boolean]
}>()

const localVisible = computed({
  get: () => props.visible,
  set: (v) => emit("update:visible", v)
})
const router = useRouter()
const storeLogin = useStoreLogin()

function onConfirm() {
  storeLogin.logout()
  localVisible.value = false
  router.push("/")
}
</script>

<template>
  <AlertDialog v-model:open="localVisible">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>退出登录</AlertDialogTitle>
        <AlertDialogDescription>确定要退出登录吗？</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>取消</AlertDialogCancel>
        <AlertDialogAction @click="onConfirm">确认</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
