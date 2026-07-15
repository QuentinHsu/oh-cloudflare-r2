# Cloudflare 依赖与部署清理设计

## 目标

将项目明确收敛为 Cloudflare R2 专用部署，删除与当前 Tailwind CSS 4 配置重复的模块、移除不再支持的 Vercel Blob 路径，并修复仍引用已删除 D1 数据库的 Cloudflare 部署脚本。

本轮不升级 Nuxt、NuxtHub、Wrangler 或其他业务依赖，不修改认证、文件管理、R2 数据结构和页面交互。

## 平台边界

项目只承诺在 Cloudflare Workers 与 R2 上运行：

- `@nuxthub/core` 继续使用 Cloudflare R2 Blob provider；
- `wrangler.jsonc` 中的 `BLOB` binding 仍是唯一生产存储配置；
- README 不再声明或展示 Vercel 部署方式；
- 删除 NuxtHub Vercel Blob driver 所需的顶层 `@vercel/blob` 依赖；
- 删除 `deploy-vercel` 脚本。

公开 Blob 路由、GitHub OAuth 和授权白名单行为保持不变。

## Tailwind CSS 依赖

当前项目已经通过 `@tailwindcss/vite` 和 `nuxt.config.ts` 的 Vite plugin 集成 Tailwind CSS 4，且主样式文件使用 `@import "tailwindcss"`。

`@nuxtjs/tailwindcss` 没有注册到 Nuxt modules，同时面向旧版 Tailwind module 集成，因此属于重复的顶层依赖。本轮删除该依赖，只保留：

- `@tailwindcss/vite`；
- `tailwindcss`；
- `nuxt.config.ts` 中的 `tailwindcss()` Vite plugin；
- `app/assets/css/main.css` 中的 Tailwind CSS 4 import。

页面样式和生成的 CSS 不应发生语义变化。

## Cloudflare 部署脚本

现有脚本在 Wrangler 部署完成后仍执行：

```text
npx wrangler d1 migrations apply DB --remote
```

项目已经没有 D1 binding、migration 文件或数据库功能，该步骤会让有效的 R2 部署因无关命令失败。

部署脚本统一使用项目声明的 pnpm 和本地 Wrangler binary：

```text
NITRO_PRESET=cloudflare_module pnpm build && wrangler deploy
```

本轮只修复脚本内容，不触发真实远程部署。验证阶段使用 Wrangler dry-run 检查产物与配置兼容性。

## 文件改动

- `package.json`：删除 `@nuxtjs/tailwindcss`、`@vercel/blob` 和 `deploy-vercel`，修复 `deploy-cloudflare`。
- `pnpm-lock.yaml`：重新解析依赖树，移除对应顶层 importer 与不再需要的传递依赖。
- `README.md`：删除 Vercel 部署说明，明确 Cloudflare R2 平台定位与部署命令。

不修改 `nuxt.config.ts`、`wrangler.jsonc` 和应用源代码，因为现有 Cloudflare R2 与 Tailwind CSS 4 配置已经符合目标架构。

## 验证

依赖变更完成后必须执行：

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm build
NITRO_PRESET=cloudflare_module pnpm build
pnpm exec wrangler deploy --dry-run
```

同时检查：

- `package.json` 和 lockfile importer 不再包含两个被删除的依赖；
- README 不再出现 Vercel 部署说明；
- Cloudflare 部署脚本不再包含 D1 migration；
- Wrangler dry-run 不创建或修改远程资源。

## 错误处理与回滚

- 如果删除 `@vercel/blob` 导致 Cloudflare preset 构建尝试加载 Vercel driver，恢复该依赖并记录 NuxtHub 的隐式构建要求；
- 如果 Wrangler dry-run 暴露既有入口配置问题，只记录为独立后续任务，不在本轮扩展部署架构；
- 如果 Tailwind 输出或页面构建失败，恢复 `@nuxtjs/tailwindcss` 并检查是否存在未被静态搜索发现的 module 注入。

## 验收标准

- 项目依赖和文档只声明 Cloudflare R2 部署路径；
- Tailwind CSS 4 只有一套构建集成；
- Cloudflare 部署脚本不会执行不存在的 D1 migration；
- 应用运行时行为没有变化；
- 完整质量检查、普通构建、Cloudflare preset 构建和 Wrangler dry-run 全部通过。
