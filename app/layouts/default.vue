<script setup lang="ts">
import { HardDrive } from 'lucide-vue-next'
</script>

<template>
  <div class="min-h-screen bg-background">
    <header class="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div class="container flex h-14 items-center justify-between">
        <NuxtLink to="/" class="flex items-center gap-2 font-semibold">
          <HardDrive class="h-5 w-5" />
          <span>R2 Dashboard</span>
        </NuxtLink>
        <div class="flex items-center gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
    <main class="container py-6">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding-left: 1rem;
  padding-right: 1rem;
}
</style>
