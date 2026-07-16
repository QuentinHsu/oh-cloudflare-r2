# FileManager 架构重构设计

## 目标

将 `app/components/FileManager.vue` 从同时承担数据获取、导航、目录树、选择状态、文件 mutation、预览和剪贴板的单体组件，重构为只负责数据获取与视图编排的容器组件。

业务状态与操作按职责拆分为可独立测试的 composables，路径和目录转换提取为纯函数。同时修复异步状态清理、刷新一致性、剪贴板失败反馈和错误类型安全问题。

## 范围

本轮包含：

- 拆分 `FileManager.vue` 的导航、选择、mutation 和预览职责；
- 提取文件路径、目标路径、目录树和链接文本纯函数；
- 为纯函数和 composables 增加单元测试；
- 确保所有异步 loading 状态在失败时恢复；
- 在成功 mutation 后同步刷新当前文件列表与全部文件夹索引；
- 等待剪贴板写入结果后再显示成功或失败 Toast；
- 用类型守卫替换 `catch (error: any)`。

本轮不包含：

- 修改服务端 API 路径、请求体或响应结构；
- 修改页面布局、Dialog 结构或主要交互文案；
- 引入 Pinia、其他状态管理库或新的运行时依赖；
- 将串行批量操作改为并发；
- 增加分页 UI、拖放上传或新的文件管理能力。

## 模块边界

### FileManager 容器

`app/components/FileManager.vue` 保留：

- `GET /api/files` 与 `GET /api/files/folders` 的两个 `useFetch`；
- 四个 composable 的创建与依赖连接；
- 现有 Toolbar、FileList 和 Dialog 的 props 与事件绑定；
- 在 mutation 成功后提供给 composable 的刷新函数。

容器中不再包含目录树构建、路径拼装、选择集合 mutation、API 操作循环或剪贴板调用。

### 纯函数

新增 `app/components/file-manager/utils.ts`，提供无 Vue 和无 I/O 依赖的函数：

- `normalizeDirectoryPath(path: string): string`：去除目录首尾斜杠并合并重复分隔；
- `getFileName(pathname: string): string`：返回最终文件名；
- `getParentDirectory(pathname: string): string`：返回文件父目录；
- `buildDestinationPath(directory: string, filename: string): string`：生成移动或重命名目标路径；
- `buildFolderTree(folders: string[]): FolderNode[]`：将扁平文件夹路径转换为目录树；
- `getExpandedParentPaths(path: string): string[]`：返回需要展开的所有父级路径；
- `buildFileLink(origin: string, pathname: string, type: "raw" | "markdown"): string`：生成复制文本。

函数必须处理空字符串、多余斜杠、根目录文件和重复文件夹输入。无效或空 pathname 不生成字符串 `undefined`。

### useFolderBrowser

新增 `app/composables/file-manager/useFolderBrowser.ts`。

输入：全部文件夹数据的只读 ref。

输出：

- `currentPath`；
- `pathParts`；
- `folderTree`；
- `expandedFolders`；
- `navigateToFolder`；
- `navigateToPath`；
- `toggleFolder`；
- `expandPathParents`。

该 composable 只管理导航和目录展示状态，不发起网络请求。

### useFileSelection

新增 `app/composables/file-manager/useFileSelection.ts`。

输入：当前文件列表的只读 ref。

输出：

- `selectedFiles`；
- `isSelectionMode`；
- `hasSelection`；
- `allSelected`；
- `toggleSelectionMode`；
- `toggleFileSelection`；
- `toggleSelectAll`；
- `clearSelection`。

退出选择模式时清空集合；文件列表为空时不得进入全选状态。

### useFileMutations

新增 `app/composables/file-manager/useFileMutations.ts`。

该 composable 管理上传、删除、单文件移动、批量删除、批量移动和重命名相关的 Dialog 与 loading 状态。它通过显式依赖对象接收：

- `request`：兼容 `$fetch` 的请求函数；
- `refreshFiles`：刷新当前文件列表；
- `refreshFolders`：刷新全部文件夹索引；
- `confirmAction`：用户确认函数；
- `notify`：`success`、`warning`、`error` 通知函数；
- 来自 `useFolderBrowser` 的当前路径与父目录展开函数；
- 来自 `useFileSelection` 的选中集合与清空函数。

所有 API 路径和请求结构保持现状：

- 上传：`POST /api/files/upload?prefix=...`；
- 删除：`DELETE /api/files/:pathname`；
- 移动与重命名：`POST /api/files/move`，body 为 `{ oldPath, newPath }`。

批量删除和批量移动继续串行执行，每个文件独立统计成功和失败数量。

### useFilePreview

新增 `app/composables/file-manager/useFilePreview.ts`。

输入依赖：

- `origin` 获取函数；
- `writeClipboard` 异步函数；
- `notify` 的成功和错误函数。

输出：

- `previewFile`；
- `showPreviewDialog`；
- `getFileUrl`；
- `openPreview`；
- `handlePreviewOpenChange`；
- `copyUrl`；
- `copyPreviewRaw`；
- `copyPreviewMarkdown`。

只有 `writeClipboard` resolve 后才显示成功提示；reject 或 Clipboard API 不可用时显示“复制失败”。

## 数据流

1. `FileManager.vue` 通过 `useFetch` 获取当前目录和全部文件夹。
2. `useFolderBrowser` 从全部文件夹数据派生目录树，并提供 `currentPath` 给当前目录请求。
3. `useFileSelection` 从当前文件列表派生全选状态。
4. 用户触发 mutation 后，`useFileMutations` 调用注入的请求函数。
5. 成功或批量完成后，同时执行 `refreshFiles` 与 `refreshFolders`，保持文件列表、虚拟目录和 Dialog 选项一致。
6. 容器把 composable 输出继续传给现有展示组件，子组件接口不变。

## 可靠性规则

### Loading 状态

上传、单文件移动、批量删除、批量移动和重命名的 loading 状态必须在 `try/finally` 中恢复。任何请求、通知或刷新异常都不能让按钮永久保持 loading。

### 刷新一致性

成功上传、删除、移动或重命名后刷新文件列表与全部文件夹索引。批量操作完成后无论全部成功还是部分失败，都刷新两份数据。

刷新调用使用 `Promise.allSettled`，避免一个刷新失败阻止另一个刷新执行；刷新失败显示通用错误提示，但不把已经成功的 R2 mutation 报告为失败。

### 错误消息

新增类型守卫从未知错误中读取 `data.message`。只有值为非空字符串时才展示服务端消息，否则使用当前通用文案。

不得使用 `any`、不得在 Toast 中输出完整错误对象、请求体、私有 bucket 名称或环境变量。

### 批量操作

批量操作保持顺序执行，避免扩大 R2 并发写入和覆盖风险。每个文件的失败不会中断后续文件；完成后沿用现有成功或部分失败统计文案，并清空选择。

### 剪贴板

复制操作改为异步：

- 写入成功后显示现有成功文案；
- 写入失败时显示“复制失败”；
- 失败不得产生未处理的 Promise rejection。

## 测试设计

### 纯函数测试

新增 `test/file-manager/utils.spec.ts`，覆盖：

- 根目录、嵌套目录和多余斜杠规范化；
- 根目录与嵌套文件的文件名和父目录；
- 移动与重命名目标路径；
- 空路径不会产生 `undefined`；
- 重复、无序和嵌套文件夹构建稳定目录树；
- 所有父路径展开结果；
- raw 与 Markdown 链接文本。

### Composable 测试

新增：

- `test/file-manager/useFolderBrowser.spec.ts`；
- `test/file-manager/useFileSelection.spec.ts`；
- `test/file-manager/useFileMutations.spec.ts`；
- `test/file-manager/useFilePreview.spec.ts`。

Mutation 测试使用注入的 request、刷新、确认和 notify mock，覆盖：

- 成功请求的 URL、method 和 body；
- 请求失败后的 loading 恢复与错误提示；
- mutation 成功后的双刷新；
- 刷新部分失败不改变 mutation 成功结果；
- 批量全部成功和部分失败计数；
- Dialog 成功关闭与失败保留；
- 重命名空值、未改变和非法分隔符校验。

Preview 测试覆盖剪贴板 resolve 与 reject，确保成功提示不会在写入完成前出现。

### 回归验证

保留现有 `FileList` 与 `FileManagerToolbar` 测试。最终必须通过：

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test --run
pnpm build
NITRO_PRESET=cloudflare_module pnpm build
pnpm exec wrangler deploy --dry-run
```

## 提交边界

实施阶段按可独立审查的任务提交：

1. 纯函数与测试；
2. 文件夹浏览与选择 composables 及测试；
3. mutation composable、可靠性修复与测试；
4. preview composable、剪贴板错误处理与测试；
5. `FileManager.vue` 容器接线与完整回归验证。

每个任务只暂存自身文件，并使用 `$commit-message en auto` 生成英文 Conventional Commit 后自动提交。

## 验收标准

- `FileManager.vue` 只包含数据获取、composable 接线和模板编排；
- 容器中不再出现文件 mutation 循环、目录树构建和剪贴板写入；
- 四个 composable 均有单一职责和独立测试；
- 路径和目录树逻辑由纯函数覆盖；
- 所有异步 loading 状态在成功和失败后都恢复；
- mutation 后文件列表与全部文件夹索引保持同步；
- 剪贴板失败有明确反馈且没有未处理 rejection；
- 不增加运行时依赖，不改变服务端 API 和现有视图结构；
- OXC、类型检查、测试、普通构建、Cloudflare 构建和 Wrangler dry-run 全部通过。
