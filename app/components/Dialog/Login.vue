<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface Props {
  visible: boolean
}
const props = defineProps<Props>()
const emit = defineEmits<{
  "update:visible": [boolean]
}>()

const router = useRouter()
const localVisible = computed({
  get: () => props.visible,
  set: (v) => emit("update:visible", v)
})
const token = ref("")
const loading = ref(false)

const { loginTokenLength } = useRuntimeConfig().public

async function onConfirm() {
  if (!token.value) return
  if (token.value.length < loginTokenLength) return
  if (/^\d+$/.test(token.value)) return

  loading.value = true
  try {
    const storeLogin = useStoreLogin()
    await storeLogin.login(token.value)
    await getVerify()
    localVisible.value = false
    router.push("/dashboard")
  } catch {
    // error
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="localVisible">
    <DialogContent class="sm:max-w-[400px]">
      <DialogHeader>
        <DialogTitle>登录</DialogTitle>
        <DialogDescription>请输入访问密钥以继续</DialogDescription>
      </DialogHeader>
      <div class="space-y-4 py-2">
        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground">访问密钥</label>
          <Input
            v-model="token"
            type="password"
            placeholder="请输入访问密钥"
            @keyup.enter="onConfirm"
          />
        </div>
        <Button class="w-full" :disabled="loading" @click="onConfirm">
          <Icon v-if="loading" name="ph:spinner" class="mr-2 animate-spin" />
          登录
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
