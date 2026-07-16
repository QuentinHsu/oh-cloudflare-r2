# 拖拽上传设计

## 目标

为文件管理器增加窗口级文件拖拽上传能力。用户将普通文件拖入页面后，文件管理区域显示明确覆盖提示；释放文件后继续进入现有上传确认框，可检查文件数量并修改目标目录，再复用现有上传请求完成写入。

该能力不改变服务端上传接口、FormData 格式、R2 pathname 语义或上传后的刷新流程。拖拽入口与工具栏文件选择入口统一支持普通文件，并共享同一套待上传批次合并规则。

## 范围

本轮包含：

- 在文件管理页面监听操作系统文件拖拽；
- 文件进入窗口时，在文件管理区域显示上传覆盖提示；
- 支持一次拖入多个普通文件；
- 拖入后打开现有上传确认框，不直接发送请求；
- 确认框已打开时继续拖入文件，并追加到当前批次；
- 同名文件以后加入的文件为准；
- 工具栏文件选择入口改为支持所有普通文件；
- 识别并忽略拖入的文件夹；
- 上传进行中拒绝新的拖入；
- 为拖拽状态、批次合并、覆盖层、工具栏和容器接线增加测试。

本轮不包含：

- 文件夹递归上传或保留本地目录结构；
- drop 后立即上传；
- 上传队列、并发批次或后台上传；
- 单文件进度条、暂停、恢复或取消请求；
- 修改覆盖同名 R2 对象的服务端语义；
- 修改上传 API、FormData 字段名或响应结构；
- 新增运行时依赖；
- 扩展到剪贴板粘贴上传。

## 默认行为

- 拖入普通文件后打开现有上传确认框。
- 新批次默认上传到当前浏览目录。
- Dialog 已打开时追加文件，并保留用户已经选择或输入的目标路径。
- 同名文件以后加入的文件替换当前批次中的同名文件。
- 有同名替换时显示“已替换 N 个同名文件”。
- 上传进行中再次 drop 时拒绝新文件，并显示“正在上传，请稍后再试”。
- 只拖入文件夹时不打开 Dialog，并显示“暂不支持上传文件夹”。
- 混合拖入文件和文件夹时忽略文件夹，只加入可用普通文件。
- 文本和链接拖拽不触发上传覆盖层，也不进入上传流程。

## 模块边界

### useFileDropzone

新增 `app/composables/file-manager/useFileDropzone.ts`，负责窗口级拖拽事件生命周期与文件提取。

输入依赖：

- `isUploading`：上传状态的只读 ref 或 getter；
- `onFilesDropped(files: File[])`：有效普通文件 drop 回调；
- `notify.warning(message: string)`：上传中拒绝或仅文件夹时的提示函数；
- 可注入的 `windowTarget`，客户端挂载时默认解析为浏览器 `window`，测试使用 `EventTarget` 替代。

输出：

- `isDraggingFiles`；
- `resetDragState`。

该 composable 在客户端挂载时注册 `dragenter`、`dragover`、`dragleave`、`drop` 和 `blur` 监听，在卸载时移除相同监听。服务端渲染阶段不得读取全局 `window`。它不管理 Dialog、目标路径、pending batch 或上传请求。

窗口级监听是必要约束：现有 Dialog 通过 Portal 渲染到文件管理容器 DOM 之外。只在容器绑定事件会导致确认框打开时无法继续拖入并追加文件。

### FileDropOverlay

新增 `app/components/file-manager/FileDropOverlay.vue`，只负责覆盖提示：

- 显示上传图标；
- 显示“释放以上传文件”；
- 显示“支持同时上传多个文件”的辅助文案；
- 使用 `role="status"`、`aria-live="polite"` 和 `aria-atomic="true"`；
- 装饰图标使用 `aria-hidden="true"`；
- 使用 `pointer-events-none`，不拦截窗口 drop；
- 使用高于现有 Dialog 的拖拽态层级，使确认框打开时仍能看到释放提示；
- 支持浅色与深色主题；
- 只使用轻量透明度和边框反馈，不增加复杂动画。

父组件仅在 `isDraggingFiles` 为 true 时渲染覆盖层。覆盖层定位在文件管理区域内部，而不是覆盖全局页面导航。

### useFileMutations

调整 `app/composables/file-manager/useFileMutations.ts` 中的文件选择流程。

现有 `handleFilesSelected` 继续作为工具栏选择和拖拽 drop 的统一入口，并增加以下规则：

1. 输入为空时不改变状态。
2. `isUploading` 为 true 时拒绝输入，提示“正在上传，请稍后再试”。
3. Dialog 未打开时创建新批次：
   - 以当前目录初始化 `uploadPathInput`；
   - 展开目标路径父目录；
   - 打开上传确认框。
4. Dialog 已打开时合并到当前批次：
   - 保留当前 `uploadPathInput`；
   - 以文件名为键合并；
   - 后加入的同名文件替换先加入的文件；
   - 不重复展开或重置目标路径。
5. 替换计数大于零时通过 warning Toast 显示“已替换 N 个同名文件”。

同名替换只作用于前端待上传批次，不提前访问 R2，也不修改服务端最终覆盖规则。批次顺序保留首次出现的位置；同名替换更新该位置对应的 File 对象。

`cancelUpload` 继续清空 pending batch。上传请求失败继续保留 Dialog、文件批次和目标路径，只有成功后才调用现有 `cancelUpload`。

### FileManager 容器

调整 `app/components/FileManager.vue`：

- 创建 `useFileDropzone`，注入 `isUploading`、Toast warning 和 `handleFilesSelected`；
- 将根容器设为覆盖层定位上下文；
- 在 `isDraggingFiles` 为 true 时渲染 `FileDropOverlay`；
- 不增加新的上传 API 调用；
- 不改变 Toolbar、UploadDialog、mutation、preview 或 selection 的现有数据流。

### FileManagerToolbar

调整 `app/components/file-manager/FileManagerToolbar.vue`：

- 移除隐藏文件输入上的 `accept="image/*"`；
- 保留 `multiple`、输入重置和 FileList-like 克隆行为；
- 文件选择入口与拖拽入口统一支持普通文件。

## 拖拽事件规则

### 文件拖拽识别

只有 `DataTransfer.types` 包含 `Files` 时才视为文件拖拽：

- `dragenter`：阻止默认行为，增加进入计数并激活覆盖层；
- `dragover`：阻止默认行为，并将 `dropEffect` 设置为 `copy`；
- `dragleave`：减少进入计数，归零时关闭覆盖层；
- `drop`：阻止默认行为，立即重置拖拽状态，然后校验和提取文件；
- `blur`：重置拖拽状态，防止拖出窗口后覆盖层残留。

文本、链接和其他非文件 DataTransfer 不阻止默认行为，不改变拖拽状态。

### 嵌套元素稳定性

浏览器在拖过子元素时会连续触发 `dragenter` 和 `dragleave`。composable 使用进入计数而不是单一布尔切换：

- 首次文件 `dragenter` 将计数从 0 增加到 1；
- 子元素进入继续增加；
- 子元素离开只减少；
- 只有计数回到 0 才关闭覆盖层；
- drop、blur 和卸载直接把计数与可见状态清零。

### 文件夹过滤

优先读取 `DataTransfer.items`：

- 只处理 `kind === "file"` 的 item；
- 如果浏览器提供 `webkitGetAsEntry()`，`entry.isDirectory` 为 true 的 item 计为文件夹并忽略；
- `entry.isFile` 或无法获取 entry 的 item 通过 `getAsFile()` 提取 File；
- `getAsFile()` 返回 null 时忽略。

如果浏览器没有可用的 `DataTransfer.items`，回退到 `DataTransfer.files`。在该回退路径中，平台未暴露目录元数据，因此只能按浏览器提供的 File 列表处理。

drop 后：

- 有普通文件：调用 `onFilesDropped`；
- 没有普通文件且检测到文件夹：显示“暂不支持上传文件夹”；
- 没有普通文件也没有可识别文件夹：静默结束。

## 待上传批次合并

合并过程不修改原始数组：

1. 复制当前 `pendingFiles`；
2. 建立文件名到数组索引的 Map；
3. 遍历新文件：
   - 文件名不存在时追加并记录索引；
   - 文件名存在时替换原索引的 File，并增加替换计数；
4. 返回新的文件数组和替换计数。

同一批新文件内部重复名称也遵循后来者优先。替换计数表示被后续文件替代的 File 数量。

## 上传数据流

1. 用户从操作系统拖入文件。
2. `useFileDropzone` 识别文件拖拽并显示 `FileDropOverlay`。
3. 用户释放文件。
4. composable 清理覆盖状态，过滤文件夹和无效 item。
5. 若正在上传，显示 warning 并结束。
6. 有效文件传给 `handleFilesSelected`。
7. `useFileMutations` 创建或合并 pending batch，并根据需要初始化当前路径。
8. `UploadDialog` 显示批次文件数量和现有路径选择 UI。
9. 用户确认后沿用现有 `POST /api/files/upload?prefix=...` 请求。
10. 成功后关闭 Dialog、清空批次并刷新当前文件列表与文件夹索引；失败时保留当前状态供重试。

## 可靠性与安全规则

### 监听清理

所有窗口监听必须使用相同 handler 引用移除。组件卸载后不得继续响应拖拽事件。测试需要验证卸载后的 drop 不再调用文件回调。

### 状态恢复

以下路径必须关闭覆盖层并归零计数：

- 正常 drop；
- 文件夹或无效 drop；
- 上传中被拒绝；
- 窗口 blur；
- composable 卸载。

### 上传状态

`useFileDropzone` 在调用文件回调前检查上传状态；`handleFilesSelected` 也保留相同守卫，防止工具栏或其他调用路径在上传中修改 pending batch。

### 隐私

Toast 和日志不得包含文件内容、本地完整路径、环境变量、bucket 名称或 R2 私有配置。同名提示只包含替换数量。

## 测试设计

### useFileDropzone 单元测试

新增 `test/file-manager/useFileDropzone.spec.ts`，使用可注入 EventTarget 和可控 DataTransfer stub 覆盖：

- 文件 dragenter 激活覆盖层并阻止默认行为；
- 嵌套 dragenter/dragleave 计数不会闪烁；
- 最后一次 dragleave 关闭覆盖层；
- dragover 设置 `dropEffect = "copy"`；
- 文本和链接拖拽不激活、不阻止；
- 普通多文件 drop 调用一次回调并传递完整 File 数组；
- 文件夹 item 被过滤；
- 只有文件夹时显示不支持提示；
- 文件与文件夹混合时只传递普通文件；
- 上传进行中拒绝 drop，pending 回调不执行；
- drop、blur 和卸载清理状态；
- 卸载后事件不再触发回调。

### useFileMutations 测试

扩展 `test/file-manager/useFileMutations.spec.ts`：

- 新批次默认当前目录并打开 Dialog；
- Dialog 已打开时追加不同名文件；
- 追加时保留用户已修改的目标路径；
- 同名文件以后加入的 File 对象为准；
- 同一批输入内重复名称后来者优先；
- warning 的替换数量准确；
- 空输入不打开 Dialog；
- 上传中输入被拒绝且批次不变；
- 上传失败后保留 Dialog、pendingFiles 和 uploadPathInput；
- 上传失败后 `isUploading` 恢复 false。

### FileDropOverlay 组件测试

新增 `test/file-manager/FileDropOverlay.spec.ts`，覆盖：

- 显示主要提示和辅助文案；
- 根节点具有 `role="status"`、`aria-live="polite"` 和 `aria-atomic="true"`；
- 图标使用 `aria-hidden="true"`；
- 根节点包含 `pointer-events-none`。

### FileManagerToolbar 测试

扩展 `test/file-manager/FileManagerToolbar.spec.ts`：

- 文件输入不再包含 `accept="image/*"`；
- 非图片普通文件仍发出 `files-selected`；
- 保留 multiple 和输入值清理行为。

### FileManager 集成测试

扩展 `test/file-manager/FileManager.spec.ts`：

- 文件拖入时渲染覆盖层；
- drop 后调用统一文件选择入口并显示上传 Dialog；
- Dialog 已打开时第二次 drop 追加批次；
- 同名第二次 drop 替换当前批次；
- 上传中 drop 不改变 pending count；
- 窗口事件在组件卸载后清理。

## 回归验证

最终实施必须通过：

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test --run
pnpm build
NITRO_PRESET=cloudflare_module pnpm build
pnpm exec wrangler deploy --dry-run
```

设计文档阶段只要求内容自洽、无占位项，并通过目标 Markdown 文件的 Oxfmt 检查。

## 提交边界

设计文档单独提交。实施阶段按可独立审查的任务拆分：

1. `useFileDropzone` 与窗口事件单元测试；
2. pending batch 合并规则与 `useFileMutations` 测试；
3. `FileDropOverlay`、Toolbar 普通文件选择和组件测试；
4. `FileManager` 接线、集成测试与完整回归验证。

每个任务只暂存自身文件，并使用 `$commit-message en auto` 生成英文 Conventional Commit 后自动提交。

## 验收标准

- 用户可以将多个普通文件拖入页面并看到文件管理区域覆盖提示；
- drop 后打开现有上传确认框，不直接上传；
- 新批次默认当前目录，已有 Dialog 批次追加时保留目标路径；
- 同名文件以后加入的为准，并提示准确替换数量；
- 上传进行中拒绝新的拖入且不修改当前批次；
- 文件夹不进入 pending batch，只有文件夹时给出明确提示；
- 文本和链接拖拽不触发上传流程；
- 工具栏与拖拽入口都支持普通文件；
- 覆盖层不会因经过子元素而闪烁，也不会在 drop、blur 或卸载后残留；
- 上传失败保留 Dialog、批次和目标路径，可直接重试；
- 不增加运行时依赖，不修改服务端 API、FormData 和 R2 语义；
- OXC、类型检查、测试、普通构建、Cloudflare 构建和 Wrangler dry-run 全部通过。
