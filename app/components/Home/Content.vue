<script setup lang="ts">
import { getVerify } from '~/server/verify'

const router = useRouter()
const visibleDialogLogin = ref(false)
async function onClickGetStarted() {
  try {
    await getVerify()
    router.push('/dashboard')
  }
  catch (error) {
    console.error(error)
    MessagePlugin.warning('Please login first')
    visibleDialogLogin.value = true
  }
}
</script>

<template>
  <div class="home-content">
    <h1>Oh Cloudflare R2</h1>
    <p>Manage your Cloudflare R2 Blob Storage</p>
    <t-button @click="onClickGetStarted">
      Get Started
    </t-button>
  </div>

  <DialogLogin v-model:visible="visibleDialogLogin" />
</template>

<style lang="scss" scoped>
.home-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  h1 {
    font-size: 2rem;
    margin-bottom: 10px;
    font-weight: bold;
  }
  p {
    font-size: 1rem;
  }
}
</style>
