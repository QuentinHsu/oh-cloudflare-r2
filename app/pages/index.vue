<script setup lang="ts">
import { Button } from '@/components/ui/button'

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
  <div class="min-h-screen bg-background">
    <!-- Header -->
    <header class="border-b border-border">
      <div class="max-w-6xl mx-auto px-6">
        <div class="h-14 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <img src="/icon-128x128.png" alt="Logo" class="w-7 h-7">
            <span class="font-semibold text-foreground text-sm">Oh Cloudflare R2</span>
          </div>
          <div class="flex items-center gap-3">
            <SwitchTheme />
            <Button size="sm" @click="onClickGetStarted">
              登录
            </Button>
          </div>
        </div>
      </div>
    </header>

    <!-- Hero -->
    <main>
      <div class="max-w-6xl mx-auto px-6 py-16 lg:py-24">
        <div class="max-w-2xl">
          <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium mb-5">
            <Icon name="ph:cloud" class="text-sm" />
            Cloudflare R2 存储管理
          </div>

          <h1 class="text-3xl lg:text-4xl font-bold text-foreground leading-tight mb-4">
            简单、快速的对象存储管理工具
          </h1>

          <p class="text-base text-muted-foreground mb-8 leading-relaxed">
            基于 Cloudflare R2 构建的文件管理系统，支持文件上传、文件夹管理、链接复制等功能。零配置部署，开箱即用。
          </p>

          <div class="flex items-center gap-3">
            <Button @click="onClickGetStarted">
              开始使用
              <Icon name="ph:arrow-right" class="ml-2 text-sm" />
            </Button>
            <Button variant="outline" as="a" href="https://github.com" target="_blank">
              <Icon name="ph:github-logo" class="mr-2 text-base" />
              GitHub
            </Button>
          </div>
        </div>

        <!-- Features -->
        <div class="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div class="p-5 border border-border rounded-lg bg-card">
            <div class="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3">
              <Icon name="ph:folder-simple" class="text-lg text-blue-500" />
            </div>
            <h3 class="font-medium text-card-foreground text-sm mb-1.5">文件夹管理</h3>
            <p class="text-sm text-muted-foreground leading-relaxed">
              支持多层级目录结构，像本地文件系统一样管理云端文件
            </p>
          </div>

          <div class="p-5 border border-border rounded-lg bg-card">
            <div class="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center mb-3">
              <Icon name="ph:upload-simple" class="text-lg text-green-500" />
            </div>
            <h3 class="font-medium text-card-foreground text-sm mb-1.5">拖拽上传</h3>
            <p class="text-sm text-muted-foreground leading-relaxed">
              支持拖拽、粘贴、批量上传，快速将文件传输到云端
            </p>
          </div>

          <div class="p-5 border border-border rounded-lg bg-card">
            <div class="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center mb-3">
              <Icon name="ph:link-simple" class="text-lg text-purple-500" />
            </div>
            <h3 class="font-medium text-card-foreground text-sm mb-1.5">快速分享</h3>
            <p class="text-sm text-muted-foreground leading-relaxed">
              一键复制文件链接或 Markdown 格式，方便嵌入到任何地方
            </p>
          </div>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="border-t border-border">
      <div class="max-w-6xl mx-auto px-6 py-5">
        <p class="text-xs text-muted-foreground">
          Built with
          <a href="https://hub.nuxt.com" target="_blank" class="text-foreground hover:underline">NuxtHub</a>
          ·
          Powered by
          <a href="https://cloudflare.com" target="_blank" class="text-primary hover:underline">Cloudflare</a>
        </p>
      </div>
    </footer>

    <DialogLogin v-model:visible="visibleDialogLogin" />
  </div>
</template>
