<script setup lang="ts">
import { Button } from '@/components/ui/button'

const router = useRouter()
const storeFileManager = useStoreFileManager()
const visibleLogout = ref(false)
const visibleUpload = ref(false)

useHead({
  title: "Dashboard - Oh Cloudflare R2",
})

async function init() {
  try {
    await getVerify()
  } catch (error) {
    router.push("/")
  }
}

onMounted(async () => {
  await init()
})
</script>

<template>
  <div class="min-h-screen bg-muted/50">
    <!-- Sidebar -->
    <aside class="fixed left-0 top-0 bottom-0 w-56 bg-card border-r border-border flex flex-col">
      <!-- Logo -->
      <div class="h-14 px-4 flex items-center gap-2.5">
        <img src="/icon-128x128.png" alt="Logo" class="w-7 h-7">
        <span class="font-semibold text-foreground text-sm">Oh R2</span>
      </div>

      <!-- Nav -->
      <nav class="flex-1 px-3 py-2">
        <div class="flex items-center gap-3 px-3 py-2 rounded-md text-sm bg-accent text-accent-foreground font-medium">
          <Icon name="ph:folder-simple" class="text-lg text-primary" />
          <span>文件管理</span>
        </div>
      </nav>

      <!-- User -->
      <div class="p-3 border-t border-border">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <Icon name="ph:user" class="text-primary-foreground text-sm" />
            </div>
            <div class="text-sm font-medium text-foreground">Admin</div>
          </div>
          <div class="flex items-center">
            <SwitchTheme />
            <Button variant="ghost" size="icon" class="h-8 w-8" @click="visibleLogout = true">
              <Icon name="ph:sign-out" class="text-base text-muted-foreground" />
            </Button>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main -->
    <main class="ml-56 min-h-screen">
      <!-- Header -->
      <header class="sticky top-0 z-10 h-14 px-6 flex items-center justify-between bg-card border-b border-border">
        <DashboardBreadcrumb />
        <div class="flex items-center gap-2">
          <Button variant="outline" size="sm" @click="storeFileManager.fetchCurrentPathData(storeFileManager.currentPath)">
            <Icon name="ph:arrows-clockwise" class="mr-2 text-base" />
            刷新
          </Button>
          <Button size="sm" @click="visibleUpload = true">
            <Icon name="ph:upload-simple" class="mr-2 text-base" />
            上传
          </Button>
        </div>
      </header>

      <!-- Content -->
      <div class="p-6">
        <DashboardResourceView />
      </div>
    </main>

    <DialogUpload v-model:visible="visibleUpload" />
    <DialogLogout v-model:visible="visibleLogout" />
  </div>
</template>
