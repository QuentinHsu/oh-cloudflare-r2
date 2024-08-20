<script setup lang="ts">
const router = useRouter()
function onClickGetStarted() {
  // TODO：
  // zh: 校验是否有权限，如果没有权限则跳转到登录页
  // en: Check if you have permission, if you do not have permission, jump to the login page
  router.push('/dashboard')
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
