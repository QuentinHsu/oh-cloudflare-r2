<script setup lang="ts">
import { GitFork as Github, HardDrive } from "@lucide/vue";

definePageMeta({
  layout: false,
});

const route = useRoute();
const error = route.query.error;
const errorMessage = computed(() =>
  error === "unauthorized" ? "该 GitHub 用户无权访问" : "登录失败，请重试",
);
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-background">
    <Card class="w-full max-w-md mx-4">
      <CardHeader class="text-center space-y-2">
        <div class="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <HardDrive class="h-6 w-6 text-primary" />
        </div>
        <CardTitle class="text-2xl">R2 Dashboard</CardTitle>
        <CardDescription> 登录以管理你的文件 </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div
          v-if="error"
          class="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center"
        >
          {{ errorMessage }}
        </div>
        <Button as-child class="w-full" size="lg">
          <a href="/api/auth/github">
            <Github class="mr-2 h-5 w-5" />
            使用 GitHub 登录
          </a>
        </Button>
      </CardContent>
    </Card>
  </div>
</template>
