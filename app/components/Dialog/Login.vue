<script setup lang="ts">
interface Props {
  visible: boolean
}
const props = defineProps<Props>()
const emit = defineEmits<{
  "update:visible": [boolean]
}>()

const router = useRouter()
const localVisible = ref(false)
const token = ref("")
const loading = ref(false)

const { loginTokenLength } = useRuntimeConfig().public

async function onConfirm() {
  if (!token.value) {
    return MessagePlugin.warning("请输入访问密钥")
  }
  if (token.value.length < loginTokenLength) {
    return MessagePlugin.warning(`密钥长度至少 ${loginTokenLength} 位`)
  }
  if (/^\d+$/.test(token.value)) {
    return MessagePlugin.warning("密钥不能为纯数字")
  }

  loading.value = true
  try {
    const storeLogin = useStoreLogin()
    await storeLogin.login(token.value)
    await getVerify()
    MessagePlugin.success("登录成功")
    localVisible.value = false
    router.push("/dashboard")
  } catch {
    MessagePlugin.error("密钥验证失败")
  } finally {
    loading.value = false
  }
}

watch(() => props.visible, (v) => { localVisible.value = v })
watch(localVisible, (v) => { emit("update:visible", v) })
</script>

<template>
  <t-dialog
    v-model:visible="localVisible"
    :header="false"
    :footer="false"
    width="400px"
    placement="center"
    :close-on-overlay-click="true"
  >
    <div class="py-4">
      <div class="text-center mb-8">
        <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
          <Icon name="material-symbols:lock-outline" class="text-3xl text-white" />
        </div>
        <h2 class="text-xl font-semibold text-slate-800 dark:text-white">访问验证</h2>
        <p class="text-sm text-slate-500 mt-1">请输入访问密钥以继续</p>
      </div>

      <div class="space-y-4">
        <t-input
          v-model="token"
          type="password"
          placeholder="请输入访问密钥"
          size="large"
          clearable
          @enter="onConfirm"
        />
        <t-button block size="large" theme="primary" :loading="loading" @click="onConfirm">
          验证并登录
        </t-button>
      </div>
    </div>
  </t-dialog>
</template>
