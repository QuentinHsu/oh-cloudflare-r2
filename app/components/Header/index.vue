<script setup lang="ts">
import { useStoreLogin } from '~/stores/useStoreLogin'

const router = useRouter()
const storeLogin = useStoreLogin()
function onClickLogo() {
  router.push('/')
}
const visibleLogout = ref(false)
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
        <div v-if="storeLogin.token" class="flex justify-center items-center " @click="visibleLogout = true">
          <Icon name="material-symbols:power-settings-circle" class="text-6" />
        </div>
      </ClientOnly>
      <SwitchTheme class="w-30px block" />
    </div>
    <DialogLogout v-model:visible="visibleLogout" />
  </t-header>
</template>
