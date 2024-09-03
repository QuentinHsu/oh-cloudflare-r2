<script setup>
import { getVerify } from '~/server/verify'
import { useStoreLogin } from '~/stores/useStoreLogin'

const router = useRouter()
useHead({
  title: 'Dashboard',
  meta: [
    {
      name: 'description',
      content: 'Dashboard page',
    },
  ],
})
async function init() {
  try {
    await getVerify()
  }
  catch (error) {
    console.error(error)
    MessagePlugin.error(error.message)
    router.push('/')
  }
}
onMounted(async () => {
  await init()
})
</script>

<template>
  <t-layout class="app-dashboard h-100vh w-100vw overflow-hidden">
    <Header />
    <t-layout>
      <!-- aside start -->
      <DashboardAside class="" />
      <!-- aside end -->

      <!-- content start -->
      <DashboardContent class="w-85vw" />
      <!-- content end -->
    </t-layout>
    <FooterBasic />
  </t-layout>
</template>
