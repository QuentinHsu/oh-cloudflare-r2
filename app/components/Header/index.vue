<script setup lang="ts">
const router = useRouter()
function onClickLogo() {
  router.push('/')
}
</script>

<template>
  <t-header class="flex justify-between items-center p-x-10px">
    <div class="flex items-center space-x-10px cursor-pointer" @click="onClickLogo">
      <img src="/icon-128x128.png" alt="Cloudflare R2" class="w-30px h-30px">
      <h1 class="text-base">
        Oh Cloudflare R2
      </h1>
    </div>

    <SwitchTheme class="w-40px" />
  </t-header>
</template>
