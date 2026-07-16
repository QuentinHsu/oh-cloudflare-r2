# 依赖现代化设计

## 目标

将项目在 `2026-07-16` 使用的全部直接运行时依赖和开发依赖升级到当前最新稳定版本，包括存在大版本变化的依赖，并解决升级引入的 API、类型、配置、测试和 Cloudflare 部署兼容问题。

升级后必须保持现有产品能力、页面结构、服务端 API、GitHub OAuth 授权策略、R2 文件语义和 Cloudflare Workers 部署方式不变。本轮不借依赖升级重新设计 UI，也不引入与兼容迁移无关的新功能。

## 升级范围

升级 `package.json` 中全部 `dependencies` 和 `devDependencies`：

- 核心框架：Nuxt、NuxtHub、nuxt-auth-utils、color-mode；
- UI 与样式：Tailwind CSS、Tailwind Vite 插件、shadcn-nuxt、Reka UI、VueUse、tailwind-merge、Lucide Vue、vue-sonner 及相关工具；
- 测试与类型：Vitest、jsdom、Vue Test Utils、Testing Library、vue-tsc、Vite Vue 插件；
- 构建与质量工具：Wrangler、Oxfmt、Oxlint。

`pnpm-lock.yaml` 必须根据新的直接依赖重新解析，不手工保留旧版传递依赖。Node 与 pnpm 先保持项目当前声明；只有最新版依赖明确要求更高运行时版本时，才同步调整 `.tool-versions`、`packageManager` 或相关文档。

## 分组迁移

升级在同一功能分支中按依赖边界逐组完成，每组形成独立的英文 Conventional Commit。

### 核心框架

优先升级 Nuxt、NuxtHub、nuxt-auth-utils 与 color-mode，处理 Nuxt module 配置、Nitro preset、运行时配置、自动导入、OAuth session 类型和 Cloudflare adapter 的兼容变化。

该组必须先通过类型检查、服务端测试、普通构建和 Cloudflare 构建，之后才能继续 UI 栈升级。

### UI 与样式

升级 Tailwind CSS、`@tailwindcss/vite`、shadcn-nuxt、Reka UI、VueUse、tailwind-merge、Lucide Vue 和 vue-sonner。

兼容修复只允许恢复现有组件行为和视觉结构，包括组件导出变化、属性或事件类型变化、图标名称变化、Tailwind 生成结果以及现有 shadcn-vue 包装组件与新版 Reka UI 的适配。不得在这一组顺便更换组件体系或重新设计页面。

### 测试、类型与构建工具

升级 Vitest、jsdom、Vue Test Utils、Testing Library、Vite Vue 插件、vue-tsc、Wrangler、Oxfmt 和 Oxlint。

处理测试环境默认值、DOM 行为、配置字段、CLI 参数和新规则变化。不得通过关闭类型检查、跳过测试、批量禁用 lint 规则或使用宽泛 `any` 来掩盖兼容问题。

## 兼容问题处理原则

遇到错误时按以下顺序处理：

1. 根据错误、类型声明和依赖发布说明定位破坏性变化；
2. 修改项目代码、配置或测试以采用新版公开 API；
3. 为容易回归的迁移行为补充针对性测试；
4. 重新运行当前分组的最小验证，再运行完整质量门禁；
5. 记录需要用户感知的行为差异或部署要求。

不会直接忽略错误、删除有效测试或降级质量门禁。只有在确认最新版存在无法在项目侧绕过的上游缺陷时，才停止该依赖的升级，并提供复现证据、影响范围和临时版本建议，由用户决定是否锁定旧版本。

## 提交与回滚边界

设计文档、核心框架升级、UI 栈升级、测试与构建工具升级，以及必要的独立兼容修复分别提交。每个任务点使用 `$commit-message en auto` 生成并执行英文 Conventional Commit。

分组提交使失败能够定位到明确的依赖边界，并允许在不撤销其他已验证升级的情况下回退单组变化。不会使用破坏性 Git 操作清除用户已有内容。

## 验证策略

每个分组至少执行与其风险对应的验证：

- 依赖安装和 lockfile 一致性；
- Oxfmt 格式检查；
- Oxlint 静态检查；
- Nuxt TypeScript 类型检查；
- Vitest 测试；
- 普通 Nuxt production build；
- `cloudflare_module` Nitro preset 构建。

全部分组完成后执行最终门禁：

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm build
NITRO_PRESET=cloudflare_module pnpm build
pnpm exec wrangler deploy --dry-run
```

还需要检查：

- 登录、会话读取和授权用户限制仍使用原有数据流；
- 文件列表、文件夹索引、上传、移动、重命名和删除的 API 契约未变化；
- 文件管理页面和对话框仍能正常渲染；
- Wrangler dry-run 正确识别 `BLOB` 与 `ASSETS` binding；
- 工作区没有意外生成文件、废弃配置或残留旧版 API。

## 完成标准

- 所有直接依赖均处于实施时可获得的最新稳定版本，或存在经验证且经用户确认的上游阻塞例外；
- lockfile 可通过 frozen install 重现；
- 升级产生的破坏性变化已使用新版公开 API 完成迁移；
- 现有功能、接口和部署目标保持不变；
- 完整质量门禁与 Cloudflare dry-run 通过；
- 每个逻辑任务点均已独立自动提交。
