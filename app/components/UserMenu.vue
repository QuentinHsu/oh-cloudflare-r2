<script setup lang="ts">
import { LogOut, User } from "@lucide/vue";

const { loggedIn, user, clear } = useUserSession();
const { t } = useI18n();

async function logout() {
  await $fetch("/api/auth/logout", { method: "POST" });
  clear();
  navigateTo("/login");
}
</script>

<template>
  <DropdownMenu v-if="loggedIn">
    <DropdownMenuTrigger as-child>
      <Button
        variant="ghost"
        size="icon"
        class="relative size-11 rounded-full md:size-9 group-data-[collapsible=icon]:size-8"
        :aria-label="t('sidebar.account')"
      >
        <Avatar class="size-9 group-data-[collapsible=icon]:size-8">
          <AvatarImage v-if="user?.avatar_url" :src="user.avatar_url" :alt="user.login" />
          <AvatarFallback>
            <User class="size-4" aria-hidden="true" />
          </AvatarFallback>
        </Avatar>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-56">
      <DropdownMenuLabel class="font-normal">
        <div class="flex flex-col space-y-1">
          <p class="text-sm font-medium">{{ user?.login }}</p>
          <p class="text-xs text-muted-foreground">{{ t("auth.githubUser") }}</p>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem class="text-destructive focus:text-destructive" @click="logout">
        <LogOut class="size-4" aria-hidden="true" />
        {{ t("auth.logout") }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
