<script setup lang="ts">
import { Home } from "@lucide/vue";

const props = defineProps<{
  pathParts: string[];
}>();

const emit = defineEmits<{
  navigate: [index: number];
}>();

const { t } = useI18n();
</script>

<template>
  <header
    class="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur"
  >
    <SidebarTrigger class="-ml-1 size-11 md:size-8" />
    <Separator orientation="vertical" class="mr-2 h-4" />

    <Breadcrumb class="min-w-0 overflow-x-auto">
      <BreadcrumbList class="flex-nowrap whitespace-nowrap">
        <BreadcrumbItem>
          <BreadcrumbLink as-child>
            <button
              type="button"
              class="flex size-11 items-center justify-center md:size-auto"
              data-path-index="-1"
              :aria-label="t('sidebar.root')"
              @click="emit('navigate', -1)"
            >
              <Home class="size-4" />
            </button>
          </BreadcrumbLink>
        </BreadcrumbItem>

        <template v-for="(part, index) in props.pathParts" :key="`${part}-${index}`">
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage v-if="index === props.pathParts.length - 1" :data-path-index="index">
              {{ part }}
            </BreadcrumbPage>
            <BreadcrumbLink v-else as-child>
              <button
                type="button"
                class="flex min-h-11 items-center px-2 md:min-h-8"
                :data-path-index="index"
                @click="emit('navigate', index)"
              >
                {{ part }}
              </button>
            </BreadcrumbLink>
          </BreadcrumbItem>
        </template>

        <BreadcrumbItem v-if="!props.pathParts.length">
          <BreadcrumbPage>{{ t("sidebar.root") }}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  </header>
</template>
