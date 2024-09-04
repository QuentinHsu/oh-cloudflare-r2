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
    <div class="p-4 h-full">
      <DashboardContent class="w-full" />
    </div>
    <FooterBasic />
  </t-layout>
</template>
