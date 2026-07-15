# 最高优先级加固设计

## 目标

本轮只处理三个最高优先级问题：限制 R2 管理面板的 GitHub 登录用户、修复 R2 列表超过 1000 个对象后漏数据的问题，以及用 OXC 工具链恢复可靠的格式化、代码检查和类型检查门禁。

不在本轮升级 Nuxt、重构 `FileManager.vue`、引入 D1/KV 文件索引、增加分页 UI 或调整部署架构。

## GitHub 用户授权

### 配置

新增私有运行时配置：

```text
NUXT_ALLOWED_GITHUB_USER_IDS=12345678,87654321
```

值为逗号分隔的 GitHub 数字 User ID。数字 ID 是 GitHub 账号的稳定标识，账号改名不会改变授权结果。

真实名单由使用本项目的私有仓库通过根目录 `wrangler.jsonc` 注入。公开仓库的 `.env.example` 和 README 只提供虚构占位值。

Nuxt 私有运行时配置键命名为 `allowedGithubUserIds`。服务端优先读取 Cloudflare 环境中的 `NUXT_ALLOWED_GITHUB_USER_IDS`，再回退到 Nuxt runtime config，以兼容当前私有子模块部署方式和本地 `.env` 开发方式。

### 默认策略

授权采用 fail-closed 策略：

- 变量未配置、为空或包含任意非数字条目时，整份配置视为无效，任何 GitHub 用户都不能建立管理会话。
- OAuth 成功但用户 ID 不在名单中时，不创建会话，并跳转至 `/login?error=unauthorized`。
- 用户 ID 在名单中时，创建包含 `authorized: true` 的签名会话。

### 服务端防线

OAuth 回调负责首次授权判断；服务端 API 中间件负责每次请求的二次校验。

受保护的 `/api/**` 路由必须同时满足：

- 会话包含用户；
- 会话包含 `authorized: true`。

公开认证路由和明确公开的 Blob 读取路由继续沿用现有例外规则。登录页根据 `error=unauthorized` 显示无权访问提示。

### 类型

在 `shared/types/auth.d.ts` 中扩展 `nuxt-auth-utils`：

- `User.id` 为 GitHub 数字 ID；
- `User.login` 为 GitHub 登录名；
- `User.avatar_url` 为头像地址；
- `UserSession.authorized` 为布尔值。

禁止使用 `any` 绕过会话类型。

## R2 列表完整性

### 分页工具

新增可独立测试的服务端列表工具。它接收 Blob storage 和列表参数，循环调用 `blob.list()`：

1. 首次请求不传 cursor；
2. 当结果包含 `hasMore: true` 时，使用返回的 cursor 请求下一页；
3. 合并所有页的 blobs 和 folders；
4. 当 `hasMore` 为 false 时返回完整结果；
5. 如果上游声称还有下一页却没有 cursor，抛出明确错误，避免死循环。

### 当前目录接口

`GET /api/files` 使用规范化后的 prefix 和 `folded: true` 查询当前目录：

- 文件直接来自所有分页合并后的 blobs；
- 文件夹来自所有分页合并后的 folders，并转换为相对于当前 prefix 的直接子目录名称；
- 文件夹去重并排序；
- 文件按上传时间倒序排列；
- 返回结构保持现有 `folders`、`files`、`currentPath`，因此前端无需修改交互。

### 全部文件夹接口

`GET /api/files/folders` 暂时保留现有用途，为上传和移动对话框提供完整文件夹树。它遍历所有分页的对象，再从 pathname 构建全部父级目录。

本轮不引入 D1/KV 索引和懒加载目录树；相关性能优化留给后续架构工作。

### 路径规范化

服务端统一规范化 prefix：

- 去除首尾多余 `/`；
- 合并连续 `/`；
- 空路径保持为空字符串；
- 非空目录 prefix 统一以 `/` 结尾。

路径规范化函数为纯函数并具有单元测试。

## OXC 工具链迁移

### 删除 ESLint

完全移除：

- `eslint`；
- `@nuxt/eslint`；
- `@nuxt/eslint-config`；
- `eslint.config.mjs`；
- `nuxt.config.ts` 中的 `@nuxt/eslint` module；
- `nuxt.config.ts` 中的 `eslint` 配置块。

项目不引入 Prettier。

### 新工具

增加开发依赖：

- `oxlint`；
- `oxfmt`。

Oxlint 启用 Vue、TypeScript 和 Vitest 支持。`correctness` 与 `suspicious` 类问题作为错误；格式规则不由 Oxlint 管理。

暂不启用实验性的 Oxlint type-aware 模式。Nuxt/Vue 类型正确性继续由 `nuxt typecheck` 和 `vue-tsc` 提供。

Oxfmt 负责 Vue、TypeScript、JavaScript、CSS、JSON、JSONC 和 Markdown 格式。生成目录、构建输出和依赖目录必须忽略。

### 脚本

`package.json` 提供：

```json
{
  "lint": "oxlint .",
  "lint:fix": "oxlint --fix .",
  "format": "oxfmt .",
  "format:check": "oxfmt --check .",
  "check": "pnpm format:check && pnpm lint && pnpm typecheck && pnpm test --run && NITRO_PRESET=cloudflare_module pnpm build"
}
```

README 同步说明 OXC 命令，不再提及 ESLint、Biome 或 Prettier。

### 提交边界

Oxfmt 首次格式化会修改大量现有文件。为保持审查清晰，实施时将纯格式化变更与授权、R2 行为变更分开提交。

## 测试设计

### 授权测试

覆盖：

- 正确解析逗号分隔的数字 ID；
- 忽略空白和重复 ID；
- 拒绝无效值；
- 未配置或空名单时拒绝用户；
- 名单内用户通过；
- 名单外用户被拒绝。

授权判断提取为无 I/O 的纯函数，OAuth handler 只负责读取 GitHub 用户、调用判断函数、写入会话或重定向。

### R2 测试

覆盖：

- 单页结果；
- 两页及以上结果；
- 超过默认 1000 条后的 cursor 继续读取；
- folders 跨页去重；
- `hasMore` 为 true 但 cursor 缺失时失败；
- 空 bucket；
- prefix 规范化。

测试通过注入最小 Blob list 接口执行，不访问真实 R2。

### 回归验证

最终必须执行且全部返回 exit code 0：

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test --run
NITRO_PRESET=cloudflare_module pnpm build
```

普通 `pnpm build` 也需要执行一次，确保本地 Node preset 没有回归。

## 错误处理

- 未授权登录不暴露名单内容，只显示通用的“该 GitHub 用户无权访问”。
- 授权配置错误按未授权处理，并在服务端记录不含密钥或完整配置值的诊断信息。
- R2 分页状态异常返回服务端错误，不返回不完整列表。
- 所有错误响应和日志不得包含 OAuth client secret、session password、真实授权名单或私有 bucket 名称。

## 验收标准

- 只有 `NUXT_ALLOWED_GITHUB_USER_IDS` 中的 GitHub 数字 ID 能创建授权会话。
- 未配置白名单时默认拒绝所有用户。
- 受保护文件 API 拒绝没有 `authorized: true` 的会话。
- R2 对象数量超过 1000 时，文件和文件夹列表仍完整。
- ESLint 相关依赖、配置和 Nuxt module 全部移除。
- Oxfmt 是唯一格式化工具，Oxlint 是唯一 lint 工具。
- `format:check`、`lint`、`typecheck`、测试、普通构建和 Cloudflare 构建全部通过。
