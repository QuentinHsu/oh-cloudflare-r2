<script setup lang="ts">
  import { toast } from 'vue-sonner';

  interface BlobFile {
    pathname: string;
    contentType: string;
    size: number;
    uploadedAt: string;
  }

  interface FilesResponse {
    folders: string[];
    files: BlobFile[];
    currentPath: string;
  }

  const currentPath = ref('');
  const pathParts = computed(() => currentPath.value.split('/').filter(Boolean));

  const { data, refresh } = await useFetch<FilesResponse>('/api/files', {
    query: { prefix: currentPath },
    watch: [currentPath],
  });

  // 获取所有文件夹路径（用于上传时选择）
  const { data: allFolders, refresh: refreshAllFolders } = await useFetch<{
    folders: string[];
  }>('/api/files/folders');

  const isUploading = ref(false);
  const showUploadDialog = ref(false);
  const uploadPathInput = ref('');
  const pendingFiles = ref<FileList | null>(null);
  const previewFile = ref<BlobFile | null>(null);
  const showPreviewDialog = ref(false);
  const fileInputRef = ref<HTMLInputElement | null>(null);

  // 移动文件相关
  const showMoveDialog = ref(false);
  const moveFile = ref<BlobFile | null>(null);
  const moveTargetPath = ref('');
  const isMoving = ref(false);

  // 批量选择相关
  const selectedFiles = ref<Set<string>>(new Set());
  const isSelectionMode = ref(false);
  const isBatchMoving = ref(false);
  const isBatchDeleting = ref(false);
  const showBatchMoveDialog = ref(false);
  const batchMoveTargetPath = ref('');

  const _hasSelection = computed(() => selectedFiles.value.size > 0);
  const allSelected = computed(() => {
    if (!data.value?.files.length) return false;
    return data.value.files.every(f => selectedFiles.value.has(f.pathname));
  });

  // 计算最终上传路径
  const finalUploadPath = computed(() => {
    const path = uploadPathInput.value.trim().replace(/^\/+|\/+$/g, '');
    return path ? `${path}/` : '';
  });

  // 根据当前输入动态过滤可选的文件夹
  const _suggestedFolders = computed(() => {
    if (!allFolders.value?.folders?.length) return [];

    const input = uploadPathInput.value.trim().replace(/^\/+/, '');
    const folders = allFolders.value.folders;

    if (!input) {
      // 输入为空时，显示顶级文件夹
      const topLevel = new Set<string>();
      folders.forEach(f => {
        const first = f.split('/')[0];
        if (first) topLevel.add(first);
      });
      return Array.from(topLevel).slice(0, 8);
    }

    // 有输入时，显示匹配的子级或同级
    const suggestions = new Set<string>();

    folders.forEach(folder => {
      const folderPath = folder.replace(/\/$/, '');

      // 完全匹配当前输入的子级
      if (folderPath.startsWith(`${input}/`)) {
        const rest = folderPath.slice(input.length + 1);
        const nextLevel = rest.split('/')[0];
        if (nextLevel) suggestions.add(`${input}/${nextLevel}`);
      }
      // 同级：共享相同父级的文件夹
      else if (folderPath.startsWith(`${input.split('/').slice(0, -1).join('/')}/`) || folderPath.includes(input)) {
        suggestions.add(folderPath);
      }
    });

    // 过滤掉与当前输入完全相同的
    return Array.from(suggestions)
      .filter(s => s !== input)
      .slice(0, 8);
  });

  // 构建文件夹树结构
  interface FolderNode {
    name: string;
    path: string;
    children: FolderNode[];
  }

  const _folderTree = computed<FolderNode[]>(() => {
    if (!allFolders.value?.folders?.length) return [];

    const root: FolderNode[] = [];
    const folders = allFolders.value.folders;

    folders.forEach(folderPath => {
      const parts = folderPath.replace(/\/$/, '').split('/').filter(Boolean);
      let currentLevel = root;

      parts.forEach((part, index) => {
        const path = parts.slice(0, index + 1).join('/');
        let existing = currentLevel.find(n => n.name === part);

        if (!existing) {
          existing = { children: [], name: part, path };
          currentLevel.push(existing);
        }
        currentLevel = existing.children;
      });
    });

    return root;
  });

  const expandedFolders = ref<string[]>([]);

  function _toggleFolder(path: string) {
    const index = expandedFolders.value.indexOf(path);
    if (index > -1) {
      expandedFolders.value.splice(index, 1);
    } else {
      expandedFolders.value.push(path);
    }
  }

  // 展开路径的所有父级文件夹
  function expandPathParents(path: string) {
    if (!path) return;
    const parts = path.replace(/\/$/, '').split('/').filter(Boolean);
    const toExpand: string[] = [];
    for (let i = 1; i <= parts.length; i++) {
      toExpand.push(parts.slice(0, i).join('/'));
    }
    // 合并到 expandedFolders，避免重复
    toExpand.forEach(p => {
      if (!expandedFolders.value.includes(p)) {
        expandedFolders.value.push(p);
      }
    });
  }

  function _selectFolder(path: string) {
    uploadPathInput.value = path;
  }

  function _navigateToFolder(folder: string) {
    currentPath.value = currentPath.value ? `${currentPath.value}${folder}/` : `${folder}/`;
  }

  function _navigateToPath(index: number) {
    if (index === -1) {
      currentPath.value = '';
    } else {
      currentPath.value = `${pathParts.value.slice(0, index + 1).join('/')}/`;
    }
  }

  function _openUploadDialog() {
    fileInputRef.value?.click();
  }

  function _handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    pendingFiles.value = input.files;
    uploadPathInput.value = currentPath.value.replace(/\/$/, '');
    expandPathParents(uploadPathInput.value);
    showUploadDialog.value = true;
  }

  async function _confirmUpload() {
    if (!pendingFiles.value?.length) return;

    isUploading.value = true;
    const formData = new FormData();

    for (const file of pendingFiles.value) {
      formData.append('files', file);
    }

    try {
      await $fetch(`/api/files/upload?prefix=${encodeURIComponent(finalUploadPath.value)}`, {
        body: formData,
        method: 'POST',
      });
      toast.success('上传成功');
      showUploadDialog.value = false;
      pendingFiles.value = null;
      if (fileInputRef.value) fileInputRef.value.value = '';
      refresh();
      refreshAllFolders();
    } catch (_e) {
      toast.error('上传失败');
    } finally {
      isUploading.value = false;
    }
  }

  function _cancelUpload() {
    showUploadDialog.value = false;
    pendingFiles.value = null;
    if (fileInputRef.value) fileInputRef.value.value = '';
  }

  async function _deleteFile(pathname: string) {
    if (!confirm('确定要删除这个文件吗？')) return;

    try {
      await $fetch(`/api/files/${encodeURIComponent(pathname)}`, {
        method: 'DELETE',
      });
      toast.success('删除成功');
      refresh();
    } catch {
      toast.error('删除失败');
    }
  }

  function getFileUrl(pathname: string) {
    return `/api/blob/${pathname}`;
  }

  function _copyUrl(pathname: string, type: 'raw' | 'markdown') {
    const url = `${window.location.origin}${getFileUrl(pathname)}`;
    const filename = pathname.split('/').pop() || pathname;

    const text = type === 'markdown' ? `![${filename}](${url})` : url;

    navigator.clipboard.writeText(text);
    toast.success(type === 'markdown' ? 'Markdown 链接已复制' : '链接已复制');
  }

  function _formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function _isImage(contentType: string) {
    return contentType?.startsWith('image/');
  }

  function _openPreview(file: BlobFile) {
    previewFile.value = file;
    showPreviewDialog.value = true;
  }

  function _closePreview(open: boolean) {
    if (!open) {
      showPreviewDialog.value = false;
      previewFile.value = null;
    }
  }

  function _openMoveDialog(file: BlobFile) {
    moveFile.value = file;
    // 默认填入当前文件所在目录
    const parts = file.pathname.split('/');
    parts.pop();
    moveTargetPath.value = parts.length ? parts.join('/') : '';
    expandPathParents(moveTargetPath.value);
    showMoveDialog.value = true;
  }

  function closeMoveDialog() {
    showMoveDialog.value = false;
    moveFile.value = null;
    moveTargetPath.value = '';
  }

  async function _confirmMove() {
    if (!moveFile.value) return;

    const filename = moveFile.value.pathname.split('/').pop();
    const targetDir = moveTargetPath.value.trim().replace(/^\/+|\/+$/g, '');
    const newPath = targetDir ? `${targetDir}/${filename}` : filename;

    if (newPath === moveFile.value.pathname) {
      toast.error('目标路径与原路径相同');
      return;
    }

    isMoving.value = true;
    try {
      await $fetch('/api/files/move', {
        body: { newPath, oldPath: moveFile.value.pathname },
        method: 'POST',
      });
      toast.success('移动成功');
      closeMoveDialog();
      refresh();
      refreshAllFolders();
    } catch (e: unknown) {
      toast.error(
        e instanceof Error && 'data' in e ? (e.data as { message?: string })?.message || '移动失败' : '移动失败',
      );
    } finally {
      isMoving.value = false;
    }
  }

  function _formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  // 批量选择相关函数
  function _toggleSelectionMode() {
    isSelectionMode.value = !isSelectionMode.value;
    if (!isSelectionMode.value) {
      selectedFiles.value.clear();
    }
  }

  function _toggleFileSelection(pathname: string) {
    if (selectedFiles.value.has(pathname)) {
      selectedFiles.value.delete(pathname);
    } else {
      selectedFiles.value.add(pathname);
    }
  }

  function _toggleSelectAll() {
    if (!data.value?.files.length) return;
    if (allSelected.value) {
      selectedFiles.value.clear();
    } else {
      for (const f of data.value.files) {
        selectedFiles.value.add(f.pathname);
      }
    }
  }

  async function _batchDelete() {
    if (!selectedFiles.value.size) return;
    if (!confirm(`确定要删除选中的 ${selectedFiles.value.size} 个文件吗？`)) return;

    isBatchDeleting.value = true;
    const paths = Array.from(selectedFiles.value);
    let successCount = 0;
    let failCount = 0;

    for (const pathname of paths) {
      try {
        await $fetch(`/api/files/${encodeURIComponent(pathname)}`, {
          method: 'DELETE',
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    if (failCount === 0) {
      toast.success(`成功删除 ${successCount} 个文件`);
    } else {
      toast.warning(`删除完成：${successCount} 成功，${failCount} 失败`);
    }

    selectedFiles.value.clear();
    isBatchDeleting.value = false;
    refresh();
    refreshAllFolders();
  }

  function _openBatchMoveDialog() {
    if (!selectedFiles.value.size) return;
    batchMoveTargetPath.value = currentPath.value.replace(/\/$/, '');
    expandPathParents(batchMoveTargetPath.value);
    showBatchMoveDialog.value = true;
  }

  function closeBatchMoveDialog() {
    showBatchMoveDialog.value = false;
    batchMoveTargetPath.value = '';
  }

  async function _confirmBatchMove() {
    if (!selectedFiles.value.size) return;

    isBatchMoving.value = true;
    const paths = Array.from(selectedFiles.value);
    const targetDir = batchMoveTargetPath.value.trim().replace(/^\/+|\/+$/g, '');
    let successCount = 0;
    let failCount = 0;

    for (const oldPath of paths) {
      const filename = oldPath.split('/').pop();
      const newPath = targetDir ? `${targetDir}/${filename}` : filename;

      if (newPath === oldPath) continue;

      try {
        await $fetch('/api/files/move', {
          body: { newPath, oldPath },
          method: 'POST',
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    if (failCount === 0) {
      toast.success(`成功移动 ${successCount} 个文件`);
    } else {
      toast.warning(`移动完成：${successCount} 成功，${failCount} 失败`);
    }

    selectedFiles.value.clear();
    closeBatchMoveDialog();
    isBatchMoving.value = false;
    refresh();
    refreshAllFolders();
  }
</script>

<template>
  <div class="space-y-4">
    <!-- 工具栏 -->
    <div class="flex items-center justify-between">
      <!-- 面包屑导航 -->
      <div class="flex items-center gap-1 text-sm">
        <Button variant="ghost" size="sm" class="h-8 px-2" @click="navigateToPath(-1)">
          <Home class="h-4 w-4" />
        </Button>
        <template v-for="(part, index) in pathParts" :key="index">
          <ChevronRight class="h-4 w-4 text-muted-foreground" />
          <Button variant="ghost" size="sm" class="h-8 px-2" @click="navigateToPath(index)">
            {{ part }}
          </Button>
        </template>
      </div>

      <!-- 操作按钮 -->
      <div class="flex items-center gap-2">
        <!-- 批量操作按钮 -->
        <template v-if="isSelectionMode && hasSelection">
          <Button size="sm" variant="outline" @click="openBatchMoveDialog" :disabled="isBatchMoving">
            <Move class="mr-2 h-4 w-4" />
            移动 ({{ selectedFiles.size }})
          </Button>
          <Button size="sm" variant="destructive" @click="batchDelete" :disabled="isBatchDeleting">
            <Trash2 class="mr-2 h-4 w-4" />
            删除 ({{ selectedFiles.size }})
          </Button>
        </template>
        <Button size="sm" variant="outline" @click="toggleSelectionMode">
          <CheckSquare v-if="isSelectionMode" class="mr-2 h-4 w-4" />
          <Square v-else class="mr-2 h-4 w-4" />
          {{ isSelectionMode ? '取消选择' : '批量操作' }}
        </Button>
        <Button size="sm" :disabled="isUploading" @click="openUploadDialog">
          <Upload class="mr-2 h-4 w-4" />
          上传文件
        </Button>
        <input
          ref="fileInputRef"
          type="file"
          multiple
          accept="image/*"
          class="hidden"
          @change="handleFileSelect"
        />
      </div>
    </div>

    <!-- 上传路径选择弹窗 -->
    <Dialog v-model:open="showUploadDialog">
      <DialogContent class="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>上传 {{ pendingFiles?.length || 0 }} 个文件</DialogTitle>
        </DialogHeader>

        <div class="space-y-3 py-2">
          <!-- 路径输入 -->
          <div class="flex items-center gap-2 px-3 py-2.5 bg-muted/50 rounded-lg border">
            <FolderOpen class="h-4 w-4 text-muted-foreground shrink-0" />
            <span class="text-muted-foreground">/</span>
            <input
              v-model="uploadPathInput"
              type="text"
              class="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              placeholder="输入路径或留空上传到根目录"
            />
          </div>

          <!-- 文件夹树 -->
          <div v-if="folderTree.length" class="max-h-40 overflow-y-auto rounded-lg border bg-muted/30 p-2">
            <div
              class="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted text-sm"
              :class="{ 'bg-muted': uploadPathInput === '' }"
              @click="selectFolder('')"
            >
              <Home class="h-3.5 w-3.5 text-muted-foreground" />
              <span>根目录</span>
            </div>
            <FolderTreeNode
              v-for="node in folderTree"
              :key="node.path"
              :node="node"
              :selected="uploadPathInput"
              :expanded="expandedFolders"
              @select="selectFolder"
              @toggle="toggleFolder"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" @click="cancelUpload">取消</Button>
          <Button size="sm" @click="confirmUpload" :disabled="isUploading">
            {{ isUploading ? '上传中...' : '上传' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 文件列表 -->
    <Card>
      <ScrollArea class="h-[calc(100vh-220px)]">
        <div class="p-4">
          <div v-if="status === 'pending'" class="text-center py-8 text-muted-foreground">
            加载中...
          </div>

          <div v-else-if="!data?.folders.length && !data?.files.length" class="text-center py-8 text-muted-foreground">
            <Folder class="mx-auto h-12 w-12 mb-2 opacity-50" />
            <p>暂无文件</p>
          </div>

          <div v-else class="space-y-1">
            <!-- 全选 -->
            <div
              v-if="isSelectionMode && data?.files.length"
              class="flex items-center gap-3 p-3 rounded-lg bg-muted/30 mb-2"
            >
              <button @click="toggleSelectAll" class="flex items-center justify-center">
                <CheckSquare v-if="allSelected" class="h-5 w-5 text-primary" />
                <Square v-else class="h-5 w-5 text-muted-foreground" />
              </button>
              <span class="text-sm text-muted-foreground">
                {{ allSelected ? '取消全选' : '全选' }}
                <span v-if="hasSelection">(已选 {{ selectedFiles.size }} 个)</span>
              </span>
            </div>

            <!-- 文件夹 -->
            <div
              v-for="folder in data?.folders"
              :key="folder"
              class="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
              @click="navigateToFolder(folder)"
            >
              <Folder class="h-5 w-5 text-blue-500" />
              <span class="flex-1 font-medium">{{ folder }}</span>
              <ChevronRight class="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            <!-- 文件 -->
            <div
              v-for="file in data?.files"
              :key="file.pathname"
              class="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
              :class="{ 'bg-primary/10': selectedFiles.has(file.pathname) }"
            >
              <!-- 选择框 -->
              <button
                v-if="isSelectionMode"
                @click="toggleFileSelection(file.pathname)"
                class="flex items-center justify-center"
              >
                <CheckSquare v-if="selectedFiles.has(file.pathname)" class="h-5 w-5 text-primary" />
                <Square v-else class="h-5 w-5 text-muted-foreground" />
              </button>
              <File v-else class="h-5 w-5 text-muted-foreground flex-shrink-0" />

              <span
                class="flex-1 min-w-0 font-medium truncate"
                :class="{ 'cursor-pointer hover:text-primary': isImage(file.contentType) }"
                @click="isImage(file.contentType) && openPreview(file)"
              >{{ file.pathname.split('/').pop() }}</span>
              <span class="text-sm text-muted-foreground whitespace-nowrap">{{ formatSize(file.size) }}</span>
              <span class="text-sm text-muted-foreground whitespace-nowrap">{{ formatDate(file.uploadedAt) }}</span>

              <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" class="h-8 w-8" @click="copyUrl(file.pathname, 'raw')">
                  <Link class="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" class="h-8 w-8" @click="copyUrl(file.pathname, 'markdown')">
                  <Image class="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" class="h-8 w-8" @click="openMoveDialog(file)">
                  <Move class="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" class="h-8 w-8 text-destructive" @click="deleteFile(file.pathname)">
                  <Trash2 class="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </Card>

    <!-- 图片预览 -->
    <Dialog :open="showPreviewDialog" @update:open="closePreview">
      <DialogContent class="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{{ previewFile?.pathname.split('/').pop() }}</DialogTitle>
        </DialogHeader>
        <div class="flex justify-center">
          <img v-if="previewFile" :src="getFileUrl(previewFile.pathname)" class="max-h-[70vh] object-contain rounded" />
        </div>
        <DialogFooter>
          <Button variant="outline" @click="previewFile && copyUrl(previewFile.pathname, 'raw')">
            <Link class="mr-2 h-4 w-4" />
            复制链接
          </Button>
          <Button variant="outline" @click="previewFile && copyUrl(previewFile.pathname, 'markdown')">
            <Image class="mr-2 h-4 w-4" />
            复制 Markdown
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 移动文件弹窗 -->
    <Dialog :open="showMoveDialog" @update:open="(open) => !open && closeMoveDialog()">
      <DialogContent class="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>移动文件</DialogTitle>
        </DialogHeader>

        <div class="space-y-3 py-2">
          <div class="text-sm text-muted-foreground">
            {{ moveFile?.pathname.split('/').pop() }}
          </div>

          <!-- 目标路径输入 -->
          <div class="flex items-center gap-2 px-3 py-2.5 bg-muted/50 rounded-lg border">
            <FolderOpen class="h-4 w-4 text-muted-foreground shrink-0" />
            <span class="text-muted-foreground">/</span>
            <input
              v-model="moveTargetPath"
              type="text"
              class="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              placeholder="输入目标路径或留空移动到根目录"
            />
          </div>

          <!-- 文件夹树 -->
          <div v-if="folderTree.length" class="max-h-40 overflow-y-auto rounded-lg border bg-muted/30 p-2">
            <div
              class="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted text-sm"
              :class="{ 'bg-muted': moveTargetPath === '' }"
              @click="moveTargetPath = ''"
            >
              <Home class="h-3.5 w-3.5 text-muted-foreground" />
              <span>根目录</span>
            </div>
            <FolderTreeNode
              v-for="node in folderTree"
              :key="node.path"
              :node="node"
              :selected="moveTargetPath"
              :expanded="expandedFolders"
              @select="(path) => moveTargetPath = path"
              @toggle="toggleFolder"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" @click="closeMoveDialog">取消</Button>
          <Button size="sm" @click="confirmMove" :disabled="isMoving">
            {{ isMoving ? '移动中...' : '移动' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 批量移动弹窗 -->
    <Dialog :open="showBatchMoveDialog" @update:open="(open) => !open && closeBatchMoveDialog()">
      <DialogContent class="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>批量移动 {{ selectedFiles.size }} 个文件</DialogTitle>
        </DialogHeader>

        <div class="space-y-3 py-2">
          <!-- 目标路径输入 -->
          <div class="flex items-center gap-2 px-3 py-2.5 bg-muted/50 rounded-lg border">
            <FolderOpen class="h-4 w-4 text-muted-foreground shrink-0" />
            <span class="text-muted-foreground">/</span>
            <input
              v-model="batchMoveTargetPath"
              type="text"
              class="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              placeholder="输入目标路径或留空移动到根目录"
            />
          </div>

          <!-- 文件夹树 -->
          <div v-if="folderTree.length" class="max-h-40 overflow-y-auto rounded-lg border bg-muted/30 p-2">
            <div
              class="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted text-sm"
              :class="{ 'bg-muted': batchMoveTargetPath === '' }"
              @click="batchMoveTargetPath = ''"
            >
              <Home class="h-3.5 w-3.5 text-muted-foreground" />
              <span>根目录</span>
            </div>
            <FolderTreeNode
              v-for="node in folderTree"
              :key="node.path"
              :node="node"
              :selected="batchMoveTargetPath"
              :expanded="expandedFolders"
              @select="(path) => batchMoveTargetPath = path"
              @toggle="toggleFolder"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" @click="closeBatchMoveDialog">取消</Button>
          <Button size="sm" @click="confirmBatchMove" :disabled="isBatchMoving">
            {{ isBatchMoving ? '移动中...' : '移动' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
