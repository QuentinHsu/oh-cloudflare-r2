<script setup>
  const router = useRouter();

  useHead({
    meta: [{ content: 'Dashboard page', name: 'description' }],
    title: 'Dashboard',
  });

  async function init() {
    try {
      await getVerify();
    } catch (error) {
      console.error(error);
      MessagePlugin.error(error.message);
      router.push('/');
    }
  }

  onMounted(async () => {
    await init();
  });
</script>

<template>
  <t-layout class="h-100vh w-100vw overflow-hidden">
    <AppHeader />
    <div class="p-4 h-full">
      <DashboardContent class="w-full" />
    </div>
    <AppFooter />
  </t-layout>
</template>
