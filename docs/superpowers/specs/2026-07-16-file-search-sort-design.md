# 文件搜索与排序设计

## 目标

为文件管理器增加仅作用于当前文件夹的即时搜索和客户端排序能力，让用户无需增加 R2 请求即可快速定位文件夹与文件，并按名称、更新时间或大小调整文件顺序。

该能力建立在现有 `FileManager.vue` 容器与 file-manager composables 架构之上。原始 API 数据保持不变，筛选和排序统一由一个可独立测试的视图 composable 派生，展示组件只接收最终可见数据和显式状态。

## 范围

本轮包含：

- 同时搜索当前文件夹内的直接子文件夹与文件；
- 提供名称、更新时间和大小三个文件排序字段；
- 提供升序和降序切换；
- 文件夹始终显示在文件之前，并独立按名称排序；
- 搜索结果中的批量全选只作用于可见文件；
- 区分普通空目录和搜索无结果两类空状态；
- 为视图状态、控件交互、空状态和选择行为增加测试。

本轮不包含：

- 修改 `GET /api/files`、R2 列表逻辑或任何服务端 API；
- 跨文件夹、递归或服务端搜索；
- 模糊搜索、搜索建议、标签或内容索引；
- 排序或搜索设置的持久化；
- 全局键盘快捷键；
- 拖拽上传；
- 新增运行时依赖。

## 默认行为

- 搜索范围仅为当前文件夹已经返回的 `folders` 和 `files`。
- 搜索忽略大小写，并对输入执行首尾空白清理。
- 空字符串或只包含空白的字符串等同于未搜索。
- 默认文件排序保持当前体验：按 `uploadedAt` 降序。
- 文件夹不跟随文件排序字段，始终按名称升序排列。
- 文件夹始终置于文件之前，不合并为一个跨类型排序列表。
- 切换目录时清空搜索词，但保留排序字段与方向。
- 改变搜索词时清空当前选择，改变排序时保留选择。
- 搜索即时生效，不增加 debounce。

## 模块边界

### useFileView

新增 `app/composables/file-manager/useFileView.ts`，负责所有纯客户端视图派生状态。

输入：

- 当前目录文件夹的只读 ref 或 getter；
- 当前目录文件的只读 ref 或 getter。

内部状态：

- `searchQuery: Ref<string>`；
- `sortField: Ref<"name" | "uploadedAt" | "size">`；
- `sortDirection: Ref<"asc" | "desc">`。

输出：

- `visibleFolders`；
- `visibleFiles`；
- `hasActiveSearch`；
- `resultCount`；
- `clearSearch`；
- `toggleSortDirection`。

该 composable 不负责导航、选择、网络请求、Toast 或 DOM 事件。所有数组派生都返回新数组，不原地修改 `useFetch` 返回的数据。

### FileViewControls

新增 `app/components/file-manager/FileViewControls.vue`，提供：

- 搜索输入框；
- 有搜索词时显示的清除按钮；
- 排序字段选择器；
- 排序方向按钮；
- 搜索激活时的结果摘要。

组件使用显式 props 和 emits，不直接引用 composable，也不持有业务状态。建议接口：

```ts
interface Props {
  searchQuery: string;
  sortField: "name" | "uploadedAt" | "size";
  sortDirection: "asc" | "desc";
  hasActiveSearch: boolean;
  resultCount: number;
}

interface Emits {
  "update:search-query": [value: string];
  "update:sort-field": [value: "name" | "uploadedAt" | "size"];
  "toggle-sort-direction": [];
  "clear-search": [];
}
```

搜索框提供明确标签或 `aria-label`。清除和排序方向等纯图标按钮同时提供 accessible name 与 `title`，确保键盘和辅助技术可以识别操作目的。排序方向名称需要表达当前动作或状态，避免只依赖箭头图形传达含义。

### FileManager 容器

调整 `app/components/FileManager.vue`：

- 将 `data.value?.folders` 和 `data.value?.files` 连接到 `useFileView`；
- 把 `FileViewControls` 放在 Toolbar 与 FileList 之间；
- 将 `visibleFolders` 和 `visibleFiles` 传给 `FileList`；
- 将 `visibleFiles` 传给 `useFileSelection`，使全选范围与当前视图一致；
- 监听搜索词变化并清空选择；
- 在所有文件夹导航入口执行导航后清空搜索词；
- 排序字段或方向变化时不清空选择。

导航清理应覆盖面包屑路径导航和文件夹行导航。排序状态由 `useFileView` 生命周期持有，因此目录变化不会重置排序。

### FileList

调整 `app/components/file-manager/FileList.vue`，增加搜索上下文 props 和清除搜索事件，用于区分两类空状态：

- 原始当前目录没有文件夹和文件：沿用“暂无文件”；
- 原始目录有内容，但当前搜索没有结果：显示包含搜索关键词的无结果提示和“清除搜索”按钮。

`FileList` 继续只渲染传入的文件夹与文件，不在组件内部再次筛选或排序。搜索无结果判断所需的状态由容器显式传入，避免通过可见数组猜测原始目录是否为空。

### useFileSelection

`app/composables/file-manager/useFileSelection.ts` 的公开接口保持不变，但输入改为 `visibleFiles`：

- `allSelected` 只检查当前可见文件；
- `toggleSelectAll` 只新增或移除当前可见文件；
- 搜索词变化由容器调用 `clearSelection`，避免隐藏项仍处于选中状态；
- 仅改变排序顺序时，文件 pathname 集合不变，现有选择继续保留。

## 筛选与排序规则

### 名称提取与匹配

文件使用 pathname 的最后一段作为显示名称和搜索名称，文件夹使用 API 返回的直接子文件夹名称。搜索比较使用规范化后的查询词与名称：

```text
normalizedQuery = searchQuery.trim().toLocaleLowerCase()
matches = name.toLocaleLowerCase().includes(normalizedQuery)
```

查询词为空时直接保留全部项目。结果摘要使用文件夹与文件可见数量之和。

### 名称比较

在 composable 实例内创建一个 `Intl.Collator`，用于文件夹名称、文件名称和稳定次级排序。比较器启用大小写不敏感的自然语言比较，使数字片段和大小写混合名称的顺序可预测。

文件夹始终使用名称升序，不受 `sortDirection` 影响。

### 文件比较

文件根据选定字段计算主排序值：

- `name`：比较显示文件名；
- `uploadedAt`：比较解析后的时间戳；
- `size`：比较数值字节大小。

主排序结果按 `sortDirection` 反转。主排序值相同时，始终以文件显示名称升序作为次级比较；如果名称仍相同，再以完整 pathname 升序比较，确保结果确定且不会随渲染改变。

无法解析的 `uploadedAt` 视为最早时间，即时间戳 `0`。因此更新时间升序时异常日期靠前，降序时靠后，同时不会产生 `NaN` 比较结果。

## 状态变化

### 搜索变化

1. `FileViewControls` 发出新的搜索词。
2. 容器更新 `searchQuery`。
3. `visibleFolders` 与 `visibleFiles` 同步重新派生。
4. 容器清空选择集合。
5. `FileList` 渲染结果或搜索无结果状态。

### 排序变化

1. 控件更新 `sortField` 或发出方向切换事件。
2. `useFileView` 重新派生 `visibleFiles`。
3. 选择集合保持不变。
4. FileList 按新顺序渲染相同可见 pathname。

### 目录变化

1. 用户通过面包屑或文件夹行导航。
2. 容器调用现有导航函数。
3. 容器调用 `clearSearch`。
4. 现有选择清理逻辑随搜索清理执行，排序字段与方向保持不变。
5. 新目录请求完成后按保留的排序设置展示。

## 测试设计

### useFileView 单元测试

新增 `test/file-manager/useFileView.spec.ts`，覆盖：

- 大小写无关的文件夹与文件名称搜索；
- 搜索词首尾空白清理；
- 空字符串和仅空白查询返回全部项目；
- 文件 pathname 只使用最后一段名称匹配；
- 文件夹始终按名称升序并置于文件列表之前；
- 名称、更新时间和大小三个字段的升序与降序；
- 主排序值相同时按文件名稳定排序；
- 同名文件按完整 pathname 得到确定顺序；
- 异常日期按最早时间处理；
- `hasActiveSearch`、`resultCount`、`clearSearch` 和 `toggleSortDirection`。

### FileViewControls 组件测试

新增 `test/file-manager/FileViewControls.spec.ts`，覆盖：

- 输入搜索词发出 `update:search-query`；
- 选择排序字段发出合法的 `update:sort-field`；
- 排序方向按钮发出 `toggle-sort-direction`；
- 清除按钮只在搜索激活时出现并发出 `clear-search`；
- 搜索结果摘要显示正确数量；
- 搜索框、清除按钮和排序方向按钮具有可访问名称，图标按钮具有 tooltip 或 `title`。

### FileList 组件测试

扩展现有 `test/file-manager/FileList.spec.ts`，覆盖：

- 原始目录为空时显示普通空状态；
- 搜索激活且无可见结果时显示关键词和清除按钮；
- 清除按钮发出对应事件；
- 有可见文件夹或文件时不显示空状态。

### FileManager 与选择回归测试

扩展容器或 composable 测试，覆盖：

- 搜索后的全选仅选择 `visibleFiles`；
- 搜索词改变时清空选择；
- 排序字段或方向改变时不清空选择；
- 文件夹行和面包屑导航均清空搜索词；
- 切换目录后保留排序字段与方向。

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

本设计文档阶段只要求设计内容自洽、无占位项，并通过目标 Markdown 文件的 Oxfmt 检查。

## 提交边界

设计文档单独提交。实施阶段按可独立审查的任务拆分：

1. `useFileView` 及其单元测试；
2. `FileViewControls` 及组件测试；
3. `FileManager`、`FileList` 与选择行为接线及回归测试；
4. 完整验证与必要的非行为性收尾修正。

每个任务只暂存自身文件，并使用 `$commit-message en auto` 生成英文 Conventional Commit 后自动提交。

## 验收标准

- 用户可以在当前文件夹内即时搜索文件夹与文件；
- 用户可以按名称、更新时间或大小对文件升序或降序排列；
- 默认文件顺序仍为更新时间降序，文件夹始终按名称置顶；
- 搜索结果稳定、大小写无关，并正确处理空查询和异常日期；
- 切换目录清空搜索但保留排序设置；
- 搜索变化清空选择，排序变化保留选择；
- 全选只作用于当前可见文件；
- 普通空目录与搜索无结果具有不同反馈，且无结果状态可以直接清除搜索；
- 控件的图标按钮具有可访问名称与提示；
- 不增加网络请求、服务端 API、R2 行为或运行时依赖；
- OXC、类型检查、测试、普通构建、Cloudflare 构建和 Wrangler dry-run 全部通过。
