<script setup lang="ts">
import { LogOut, User } from "lucide-vue-next";

const { loggedIn, user, clear } = useUserSession();

async function logout() {
  await $fetch("/api/auth/logout", { method: "POST" });
  clear();
  navigateTo("/login");
}
</script>

<template>
  <DropdownMenu v-if="loggedIn">
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" class="relative h-9 w-9 rounded-full">
        <Avatar class="h-9 w-9">
          <AvatarImage v-if="user?.avatar_url" :src="user.avatar_url" :alt="user.login" />
          <AvatarFallback>
            <User class="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-56">
      <DropdownMenuLabel class="font-normal">
        <div class="flex flex-col space-y-1">
          <p class="text-sm font-medium">{{ user?.login }}</p>
          <p class="text-xs text-muted-foreground">GitHub 用户</p>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem @click="logout" class="text-destructive">
        <LogOut class="mr-2 h-4 w-4" />
        退出登录
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
