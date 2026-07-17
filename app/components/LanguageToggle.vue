<script setup lang="ts">
import { Languages } from "@lucide/vue";

type SupportedLocale = "en" | "zh-CN";

const { locale, locales, setLocale, t } = useI18n();

function selectLocale(code: SupportedLocale) {
  return setLocale(code);
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        variant="ghost"
        size="icon"
        class="size-11 md:size-8 group-data-[collapsible=icon]:size-8"
        :aria-label="t('locale.toggle')"
      >
        <Languages class="size-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuRadioGroup :model-value="locale">
        <DropdownMenuRadioItem
          v-for="item in locales"
          :key="item.code"
          :value="item.code"
          :data-locale="item.code"
          @click="selectLocale(item.code as SupportedLocale)"
        >
          {{ item.name }}
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
