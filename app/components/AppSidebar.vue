<script setup lang="ts">
import { HardDrive, Home, Upload } from "@lucide/vue";
import { ref } from "vue";
import type { FileListLike, FolderNode } from "./file-manager/types";

const props = defineProps<{
  folderTree: FolderNode[];
  currentPath: string;
  expandedFolders: string[];
  isUploading: boolean;
}>();

const emit = defineEmits<{
  navigate: [path: string];
  "toggle-folder": [path: string];
  "files-selected": [files: FileListLike];
}>();

const { t } = useI18n();
const fileInputRef = ref<HTMLInputElement | null>(null);

function triggerUpload() {
  fileInputRef.value?.click();
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const sourceFiles = input.files ? Array.from(input.files) : [];

  if (sourceFiles.length) {
    const files = sourceFiles.slice() as FileListLike;
    files.item = (index: number) => sourceFiles[index] ?? null;
    emit("files-selected", files);
  }

  input.value = "";
}
</script>

<template>
  <Sidebar collapsible="icon">
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" :tooltip="t('app.name')">
            <span
              class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"
            >
              <HardDrive class="size-4" />
            </span>
            <span class="min-w-0 flex-1 truncate font-semibold">{{ t("app.name") }}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>

      <Button
        class="h-11 w-full justify-start md:h-9"
        :disabled="props.isUploading"
        @click="triggerUpload"
      >
        <Upload class="size-4" />
        <span class="group-data-[collapsible=icon]:hidden">{{ t("sidebar.upload") }}</span>
      </Button>
      <input ref="fileInputRef" type="file" multiple class="hidden" @change="handleFileChange" />
    </SidebarHeader>

    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>{{ t("sidebar.files") }}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                :is-active="props.currentPath === ''"
                :tooltip="t('sidebar.root')"
                data-folder-path=""
                @click="emit('navigate', '')"
              >
                <Home class="size-4" />
                <span>{{ t("sidebar.root") }}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          <div class="mt-1 space-y-0.5">
            <FolderTreeNode
              v-for="node in props.folderTree"
              :key="node.path"
              :node="node"
              :selected="props.currentPath"
              :expanded="props.expandedFolders"
              @select="emit('navigate', $event)"
              @toggle="emit('toggle-folder', $event)"
            />
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>

    <SidebarFooter>
      <div class="flex items-center justify-between gap-1 group-data-[collapsible=icon]:flex-col">
        <ThemeToggle />
        <LanguageToggle />
        <UserMenu />
      </div>
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
</template>
