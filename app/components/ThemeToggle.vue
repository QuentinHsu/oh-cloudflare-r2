<script setup lang="ts">
import { Monitor, Moon, Sun } from "@lucide/vue";

const colorMode = useColorMode();
const { t } = useI18n();

const themes = [
  { value: "light", icon: Sun, labelKey: "theme.light" },
  { value: "dark", icon: Moon, labelKey: "theme.dark" },
  { value: "system", icon: Monitor, labelKey: "theme.system" },
] as const;

function updateTheme(value: unknown) {
  if (value === "light" || value === "dark" || value === "system") {
    colorMode.preference = value;
  }
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        variant="ghost"
        size="icon"
        class="relative size-11 md:size-9"
        :aria-label="t('theme.toggle')"
      >
        <Sun
          class="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
          aria-hidden="true"
        />
        <Moon
          class="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
          aria-hidden="true"
        />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuRadioGroup :model-value="colorMode.preference" @update:model-value="updateTheme">
        <DropdownMenuRadioItem v-for="theme in themes" :key="theme.value" :value="theme.value">
          <component :is="theme.icon" class="size-4" aria-hidden="true" />
          {{ t(theme.labelKey) }}
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
