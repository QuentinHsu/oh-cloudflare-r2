<script setup>
const router = useRouter()
const storeLogin = useStoreLogin()
const visibleLogout = ref(false)
const visibleUpload = ref(false)

useHead({
  title: "Dashboard - Oh Cloudflare R2",
})

async function init() {
  try {
    await getVerify()
  } catch (error) {
    MessagePlugin.error("请先登录")
    router.push("/")
  }
}

onMounted(async () => {
  await init()
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900">
    <!-- Sidebar -->
    <aside class="fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
      <!-- Logo -->
      <div class="h-16 px-6 flex items-center gap-3 border-b border-slate-200 dark:border-slate-700">
        <img src="/icon-128x128.png" alt="Logo" class="w-8 h-8">
        <span class="font-semibold text-slate-800 dark:text-white">Oh R2</span>
      </div>

      <!-- Nav -->
      <nav class="flex-1 p-4">
        <div class="space-y-1">
          <div class="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700/50 text-slate-900 dark:text-white font-medium">
            <Icon name="material-symbols:folder-outline" class="text-xl" />
            文件管理
          </div>
        </div>
      </nav>

      <!-- User -->
      <div class="p-4 border-t border-slate-200 dark:border-slate-700">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
              <Icon name="material-symbols:person" class="text-white text-lg" />
            </div>
            <div>
              <div class="text-sm font-medium text-slate-800 dark:text-white">Admin</div>
              <div class="text-xs text-slate-500">已登录</div>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <SwitchTheme />
            <t-button variant="text" shape="square" size="small" @click="visibleLogout = true">
              <Icon name="material-symbols:logout" class="text-lg text-slate-500" />
            </t-button>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main -->
    <main class="ml-64 min-h-screen">
      <!-- Header -->
      <header class="h-16 px-8 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <DashboardBreadcrumb />
        <div class="flex items-center gap-3">
          <t-button variant="outline" @click="useStoreFileManager().fetchCurrentPathData(useStoreFileManager().currentPath)">
            <template #icon><Icon name="material-symbols:refresh" /></template>
            刷新
          </t-button>
          <t-button theme="primary" @click="visibleUpload = true">
            <template #icon><Icon name="material-symbols:upload-rounded" /></template>
            上传文件
          </t-button>
        </div>
      </header>

      <!-- Content -->
      <div class="p-8">
        <DashboardResourceView />
      </div>
    </main>

    <DialogUpload v-model:visible="visibleUpload" />
    <DialogLogout v-model:visible="visibleLogout" />
  </div>
</template>
