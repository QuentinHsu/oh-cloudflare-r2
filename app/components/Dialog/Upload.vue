<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface Props {
  visible: boolean
}
const props = defineProps<Props>()
const emit = defineEmits<{
  "update:visible": [boolean]
}>()

const localVisible = computed({
  get: () => props.visible,
  set: (v) => emit("update:visible", v)
})
const storeFileManager = useStoreFileManager()
const uploadPath = ref("")
const files = ref<File[]>([])
const uploading = ref(false)
const fileInput = ref<HTMLInputElement>()

function onOpen() {
  uploadPath.value = storeFileManager.currentPath
  files.value = []
}

function onClose() {
  storeFileManager.fetchCurrentPathData(storeFileManager.currentPath)
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) {
    files.value = Array.from(input.files)
  }
}

function removeFile(index: number) {
  files.value.splice(index, 1)
}

async function onUpload() {
  if (files.value.length === 0) return
  uploading.value = true
  
  const storeLogin = useStoreLogin()
  const upload = useUpload(`/api/blob?prefix=${uploadPath.value}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${storeLogin.token || ""}` },
  })

  try {
    for (const file of files.value) {
      await upload(file)
    }
    localVisible.value = false
    onClose()
  } finally {
    uploading.value = false
  }
}

watch(localVisible, (v) => {
  if (v) onOpen()
})
</script>

<template>
  <Dialog v-model:open="localVisible">
    <DialogContent class="sm:max-w-[480px]">
      <DialogHeader>
        <DialogTitle>上传文件</DialogTitle>
        <DialogDescription>选择文件上传到当前目录</DialogDescription>
      </DialogHeader>
      <div class="space-y-4 py-2">
        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground">上传路径</label>
          <Input v-model="uploadPath" placeholder="留空则上传到根目录" />
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground">选择文件</label>
          <div
            class="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            @click="fileInput?.click()"
          >
            <Icon name="ph:upload-simple" class="text-3xl text-muted-foreground mb-2" />
            <p class="text-sm text-muted-foreground">点击或拖拽文件到此处</p>
            <input
              ref="fileInput"
              type="file"
              multiple
              class="hidden"
              @change="onFileChange"
            >
          </div>
        </div>

        <!-- File List -->
        <div v-if="files.length > 0" class="space-y-2">
          <div
            v-for="(file, index) in files"
            :key="index"
            class="flex items-center justify-between px-3 py-2 bg-muted rounded-md"
          >
            <div class="flex items-center gap-2 min-w-0">
              <Icon name="ph:file" class="text-muted-foreground flex-shrink-0" />
              <span class="text-sm truncate">{{ file.name }}</span>
            </div>
            <Button variant="ghost" size="icon" class="h-6 w-6 flex-shrink-0" @click="removeFile(index)">
              <Icon name="ph:x" class="text-xs" />
            </Button>
          </div>
        </div>

        <Button class="w-full" :disabled="files.length === 0 || uploading" @click="onUpload">
          <Icon v-if="uploading" name="ph:spinner" class="mr-2 animate-spin" />
          上传 {{ files.length > 0 ? `(${files.length})` : '' }}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
