# 文件领域可靠性重构设计

## 背景

项目当前的格式检查、代码检查、类型检查、89 个测试以及 Cloudflare 构建均已通过。文件管理器也已经完成第一轮组件与 composable 拆分，因此本轮不重复进行表层组件整理，而是集中解决文件操作领域仍然存在的边界松散问题：API handler 直接操作 R2、路径校验不统一、错误依赖文本传播、批量操作由前端逐项请求，以及 `useFileMutations.ts` 同时管理过多工作流。

本轮允许调整现有管理 API，并同步修改前端调用方。目标是提高正确性、可恢复性和长期可维护性，而不是保持旧管理 API 兼容。

## 目标

- 为上传、移动、重命名、删除和批量操作建立清晰的文件领域边界。
- 统一文件路径规则、输入校验、错误码和 API 响应结构。
- 将 NuxtHub Blob 调用隔离到可替换、可注入测试的存储适配层。
- 将批量移动和批量删除收敛为服务端批量 API。
- 正确表达 R2 非原子移动产生的部分完成状态。
- 拆分前端文件操作状态，降低单个 composable 的职责密度。
- 保持公开资源 URL 可用，避免破坏已经发布的图片或 Blob 外链。

## 非目标

- 不引入 Pinia 或其他全局状态管理器。
- 不引入数据库、D1、KV 或文件索引服务。
- 不增加新的运行时依赖。
- 不实现跨请求事务或伪装 R2 移动为原子操作。
- 不引入依赖真实 R2 Bucket 的集成测试。
- 不改变 `/api/blob/**` 与 `/images/**` 的公开 URL 结构。

## 架构

服务端采用三个明确层次：

1. API 层负责读取请求、验证契约、调用领域服务并生成 HTTP 响应。
2. 文件领域服务负责上传、移动、重命名、删除、批量执行、冲突判断和结果分类。
3. R2 存储适配层封装 NuxtHub Blob API，并向领域服务提供稳定接口。

建议的主要文件结构：

```text
server/
├── api/files/
│   ├── index.get.ts
│   ├── upload.post.ts
│   ├── operations.post.ts
│   └── batch.post.ts
├── services/
│   └── file-service.ts
├── repositories/
│   └── blob-file-repository.ts
└── utils/
    ├── file-path.ts
    ├── file-errors.ts
    └── file-contracts.ts
```

API handler 不得直接调用 `blob.put`、`blob.get`、`blob.delete`、`blob.del` 或 `blob.list`。所有存储 I/O 必须经过 repository，所有业务决策必须位于 service。

## 路径模型

领域内部统一使用无前导、无尾随斜杠的路径：

```text
photos/2026/cat.png
```

目录使用相同表示方式，例如 `photos/2026`，根目录使用空字符串。

路径解析必须拒绝：

- 文件路径为空；
- `.` 或 `..` 路径段；
- 反斜杠；
- 控制字符；
- 连续斜杠产生的空路径段；
- 超出约定上限的完整路径或文件名；
- 移动源与目标相同；
- 默认覆盖已经存在的目标文件。

所有入口必须复用同一组纯路径函数。前端只做即时反馈，服务端校验是最终事实来源。

## API 契约

管理 API 统一使用显式成功和失败结构：

```ts
type ApiSuccess<T> = {
  ok: true;
  data: T;
};

type ApiFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};
```

目标路由为：

```text
GET  /api/files?path=photos
POST /api/files/upload
POST /api/files/operations
POST /api/files/batch
```

### 单文件操作

`POST /api/files/operations` 接收：

```ts
type FileOperation =
  { action: "move"; source: string; destination: string } | { action: "delete"; path: string };
```

重命名使用 `move` 表达，目标路径与源路径处于同一目录。领域层不维护重复的 rename 分支。

### 批量操作

`POST /api/files/batch` 接收受数量上限约束的 `FileOperation[]`，并返回每项结果：

```ts
type BatchResult = {
  results: Array<{
    operation: FileOperation;
    ok: boolean;
    error?: {
      code: string;
      message: string;
      recoverable: boolean;
    };
  }>;
};
```

批量项目按顺序执行，单项失败不阻止后续项目。顺序执行可以限制 Cloudflare Worker 的内存、子请求和并发压力，并使结果顺序与请求顺序保持一致。

### 上传

上传继续使用 multipart 请求。目标目录作为普通 multipart 字段传递，不再拼接到查询字符串。服务端先验证目录、文件数量和全部文件名，再执行任何 R2 写入。

## 错误模型

前端只依赖稳定错误码，不解析服务端消息。首批错误码包括：

```text
INVALID_PATH
INVALID_FILE
SOURCE_NOT_FOUND
DESTINATION_EXISTS
SOURCE_EQUALS_DESTINATION
STORAGE_READ_FAILED
STORAGE_WRITE_FAILED
STORAGE_DELETE_FAILED
MOVE_PARTIALLY_COMPLETED
UNAUTHORIZED
FORBIDDEN
```

错误消息必须适合向用户展示，不能包含 Bucket 名称、底层异常堆栈、Cloudflare 环境细节、OAuth 密钥、会话内容或授权名单。

服务端应使用类型安全的错误类或判别联合传播领域错误。禁止使用 `any` 读取未知异常；未知异常统一映射为安全的存储或内部错误。

## 移动可靠性

R2 不提供原子重命名。移动操作的实际顺序为：

1. 验证源路径与目标路径。
2. 确认源对象存在。
3. 确认目标对象不存在。
4. 读取源对象。
5. 写入目标对象。
6. 删除源对象。

如果目标写入失败，源对象保持不变，返回 `STORAGE_WRITE_FAILED`。

如果目标写入成功但源删除失败，不能返回普通失败或假装回滚成功。服务层返回 `MOVE_PARTIALLY_COMPLETED`，并在安全详情中提供源路径和目标路径。该错误标记为可恢复，前端明确提示两个对象可能同时存在。

本轮不自动删除目标副本作为补偿，因为补偿删除也可能失败，并可能隐藏已经成功写入的数据。

## 前端设计

当前 `useFileMutations.ts` 拆分为：

```text
app/composables/file-manager/
├── useFileApi.ts
├── useFileUpload.ts
├── useFileOperations.ts
└── useBatchFileOperations.ts
```

- `useFileApi` 封装请求、响应解包和错误码到界面文案的映射。
- `useFileUpload` 管理待上传文件、目标目录、上传状态、失败保留和重试。
- `useFileOperations` 管理单文件移动、重命名、删除和相关对话框状态。
- `useBatchFileOperations` 构建单次批量请求并处理逐项结果。
- `FileManager.vue` 只组合数据源、composable 和展示组件。

### 操作后状态规则

- 全部成功：关闭对应对话框，清理相关选择，刷新当前目录与文件夹索引。
- 部分成功：刷新数据，只保留失败项目的选择状态，并显示成功与失败数量。
- 全部失败：保留选择、输入和对话框状态，允许修正后重试。
- 操作成功但刷新失败：按真实操作结果提示成功，同时提示当前列表可能不是最新状态。
- 批量操作不做乐观更新，界面以服务端逐项结果为准。

`MOVE_PARTIALLY_COMPLETED` 必须展示明确提示，指出目标副本已经创建但源文件删除失败，并展示源、目标路径供用户处理。

## 认证与 Origin 安全

管理 API 继续要求会话同时满足 `session.user` 存在和 `authorized === true`。

Origin 白名单解析提取为纯函数，涵盖精确 Origin、通配符子域名和非法 URL。非法 `Origin` 或 `Referer` 必须稳定返回 403，不能因 `new URL()` 抛出未处理异常而产生 500。

公开资源路由继续使用现有 Origin 策略，同时复用服务端路径校验。公开 URL 结构保持不变。

## 限制与资源保护

- 单次批量请求最多包含 100 个操作。
- 单次上传最多包含 50 个文件。
- UTF-8 文件名最多 255 个字节，完整路径最多 1024 个字节。
- 文件大小由 Cloudflare Worker 与 R2 平台限制作为最终边界，本轮不增加需要缓冲整个文件的自定义大小检测。
- 批量写操作保持顺序执行。
- 所有写操作必须在第一次存储 I/O 前完成可预先执行的请求级校验。

上述限制以具名常量表达，不散落在 handler 中。字节长度使用 `TextEncoder` 计算，避免把 JavaScript 字符数量误当作 UTF-8 字节数。

## 测试设计

### 路径工具测试

覆盖规范路径、根目录、非法段、反斜杠、控制字符、空路径段、长度边界、文件路径与目录路径差异。

### Repository 测试

通过最小 Blob 接口假实现验证 NuxtHub Blob 调用映射，不访问真实 R2。

### 文件服务测试

覆盖上传、删除、移动成功、源不存在、目标冲突、源目标相同、读取失败、写入失败，以及目标写入成功后源删除失败。

### 批量服务测试

覆盖全部成功、部分成功、全部失败、空请求、超过项目上限、执行顺序和逐项结果保持。

### API 契约测试

覆盖请求解析、非法请求、HTTP 状态、成功响应、错误响应和稳定错误码。

### 前端 composable 测试

覆盖成功、失败、部分成功、刷新失败、失败项选择保留、对话框保留和重试。

### 组件测试

`FileManager.vue` 只保留关键组合流程测试。业务规则在 composable 和 service 层验证，避免组件测试重复覆盖内部细节。

## 验证

实现完成后必须执行：

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test --run
pnpm build
NITRO_PRESET=cloudflare_module pnpm build
```

所有命令必须返回 exit code 0。构建期间来自上游依赖且不影响退出码的 sourcemap 或 pure annotation 警告可以记录，但不能掩盖项目自身错误。

## 验收标准

- API handler 不再直接访问 NuxtHub Blob。
- 所有文件操作使用统一路径模型与输入验证。
- 前端不再通过循环请求实现批量移动或批量删除。
- 前端只依赖错误码，不依赖服务端错误文本解析行为。
- 移动的复制成功、删除失败状态能被准确返回和展示。
- 部分成功时只保留失败项目，允许用户继续处理。
- Origin 非法输入稳定返回安全响应，不产生非预期 500。
- `useFileMutations.ts` 的职责被拆分到聚焦的 composable。
- 不增加运行时依赖、全局状态管理器或数据库。
- 完整测试和两种构建方式全部通过。

## 提交策略

实施阶段按可独立验证的任务拆分提交。每个提交只暂存当前任务相关文件，并使用 `/commit-message en auto` 从暂存差异生成、规范化和执行英文 Conventional Commit。最终不得包含未经请求的 AI 或工具署名。
