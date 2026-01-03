<script setup>
useHead({
  title: "Oh Cloudflare R2",
  meta: [{ name: "description", content: "Oh Cloudflare R2, manage your Cloudflare R2 Blob Storage" }],
})

const router = useRouter()
const visibleDialogLogin = ref(false)

async function onClickGetStarted() {
  try {
    await getVerify()
    router.push("/dashboard")
  } catch {
    visibleDialogLogin.value = true
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
    <!-- Header -->
    <header class="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/70 dark:bg-slate-900/70 border-b border-slate-200/50 dark:border-slate-700/50">
      <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <img src="/icon-128x128.png" alt="Logo" class="w-8 h-8">
          <span class="font-semibold text-slate-800 dark:text-white">Oh Cloudflare R2</span>
        </div>
        <SwitchTheme />
      </div>
    </header>

    <!-- Hero -->
    <main class="pt-16 min-h-screen flex items-center justify-center px-6">
      <div class="text-center max-w-2xl">
        <div class="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-sm font-medium">
          <Icon name="material-symbols:cloud-outline" class="text-lg" />
          Powered by Cloudflare R2
        </div>

        <h1 class="text-5xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
          简单高效的<br>
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">对象存储管理</span>
        </h1>

        <p class="text-lg text-slate-600 dark:text-slate-400 mb-10 leading-relaxed">
          轻松管理你的 Cloudflare R2 存储桶，支持文件上传、文件夹管理、快速复制链接等功能
        </p>

        <div class="flex items-center justify-center gap-4">
          <t-button size="large" theme="primary" @click="onClickGetStarted">
            <template #icon><Icon name="material-symbols:arrow-forward-rounded" /></template>
            开始使用
          </t-button>
          <t-button size="large" variant="outline" href="https://github.com" target="_blank">
            <template #icon><Icon name="material-symbols:code" /></template>
            GitHub
          </t-button>
        </div>

        <!-- Features -->
        <div class="mt-20 grid grid-cols-3 gap-6 text-left">
          <div class="p-6 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
            <div class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
              <Icon name="material-symbols:folder-outline" class="text-xl text-blue-600 dark:text-blue-400" />
            </div>
            <h3 class="font-semibold text-slate-800 dark:text-white mb-2">文件夹管理</h3>
            <p class="text-sm text-slate-600 dark:text-slate-400">支持层级目录结构，轻松组织你的文件</p>
          </div>
          <div class="p-6 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
            <div class="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <Icon name="material-symbols:upload-rounded" class="text-xl text-green-600 dark:text-green-400" />
            </div>
            <h3 class="font-semibold text-slate-800 dark:text-white mb-2">快速上传</h3>
            <p class="text-sm text-slate-600 dark:text-slate-400">拖拽或粘贴即可上传，支持批量操作</p>
          </div>
          <div class="p-6 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
            <div class="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
              <Icon name="material-symbols:link" class="text-xl text-purple-600 dark:text-purple-400" />
            </div>
            <h3 class="font-semibold text-slate-800 dark:text-white mb-2">一键复制</h3>
            <p class="text-sm text-slate-600 dark:text-slate-400">快速复制文件链接或 Markdown 格式</p>
          </div>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="absolute bottom-0 left-0 right-0 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
      Built with
      <a href="https://hub.nuxt.com" target="_blank" class="text-green-600 dark:text-green-400 hover:underline">NuxtHub</a>
      &
      <a href="https://cloudflare.com" target="_blank" class="text-orange-600 dark:text-orange-400 hover:underline">Cloudflare</a>
    </footer>

    <DialogLogin v-model:visible="visibleDialogLogin" />
  </div>
</template>
