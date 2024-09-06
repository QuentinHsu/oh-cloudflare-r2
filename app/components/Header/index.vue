<script setup lang="ts">
import type { PopconfirmProps } from 'tdesign-vue-next'
import { useStoreLogin } from '~/stores/useStoreLogin'

const router = useRouter()
const storeLogin = useStoreLogin()
function onClickLogo() {
  router.push('/')
}
const visiblePopConfirmLogout = ref(false)
const onClickLogout: PopconfirmProps['onVisibleChange'] = function (val, context = {}) {
  if (context && context.trigger === 'confirm') {
    storeLogin.logout()
    visiblePopConfirmLogout.value = false
    router.push('/')
  }
  else {
    visiblePopConfirmLogout.value = val
  }
}
</script>

<template>
  <t-header class="flex justify-between items-center p-x-10px h-full">
    <div class="flex items-center space-x-10px cursor-pointer" @click="onClickLogo">
      <img src="/icon-128x128.png" alt="Cloudflare R2" class="w-30px h-30px">
      <h1 class="text-base">
        Oh Cloudflare R2
      </h1>
    </div>
    <div class="flex justify-center items-center space-x-10px">
      <ClientOnly>
        <t-popconfirm
          v-if="storeLogin.token"
          :visible="visiblePopConfirmLogout"
          theme="default"
          placement="bottom"
          content="Are you sure you want to logout?"
          @visible-change="onClickLogout"
        >
          <Icon name="material-symbols:power-settings-circle" class="text-6" />
        </t-popconfirm>
      </ClientOnly>
      <SwitchTheme class="w-30px" />
    </div>
  </t-header>
</template>
