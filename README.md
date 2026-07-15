# R2 Dashboard

现代化的 Cloudflare R2 文件管理面板（Nuxt 4）。

生产部署目标为 Cloudflare Workers + R2。本项目不再提供 Vercel Blob 或其他存储平台的部署支持。

## 功能一览

- 上传、移动、删除 R2 文件
- 虚拟文件夹树 / 面包屑导航
- 文件预览（含图片）、批量操作
- URL 复制（原始链接 & Markdown）
- GitHub OAuth 登录与会话保护
- 域名白名单与通配符 Origin 校验
- 深浅色主题、响应式 UI、Toast 提示

## 推荐使用方式：作为模板 / 子仓库嵌入

> 为什么推荐：将本仓库作为子模块/子目录嵌入主项目，后续只需拉取子仓库更新即可同步最新面板能力，主仓库可保留自身配置与密钥。

- 子模块添加与独立配置：

```bash
git submodule add https://github.com/QuentinHsu/oh-cloudflare-r2.git oh-cloudflare-r2
```

### 根 package.json 脚本示例

```json
"preinstall": "git submodule sync --recursive && git submodule update --init --recursive --remote --force --checkout",
"test": "echo \"Error: no test specified\" && exit 1",
"build": "cd oh-cloudflare-r2 && NITRO_PRESET=cloudflare_module pnpm build",
"deploy": "ROOT=$(pwd); pnpm -C oh-cloudflare-r2 dlx wrangler deploy --config \"$ROOT/wrangler.jsonc\"",
"postinstall": "pnpm -C oh-cloudflare-r2 install"
```

- 子模块内部 `.env` 只用于本地；生产密钥放私有仓库根 `wrangler.jsonc` 或 Cloudflare Dashboard。
- 需要更新面板时：在子模块目录执行 `git pull`（或 `git subtree pull`），即可同步新版本。

### 根 wrangler.jsonc 示例

```jsonc
{
  "name": "r2-dashboard",
  "$schema": "oh-cloudflare-r2/node_modules/wrangler/config-schema.json",
  "main": "./oh-cloudflare-r2/.output/server/index.mjs",
  "assets": {
    "directory": "./oh-cloudflare-r2/.output/public",
  },
  "compatibility_date": "2025-12-11",
  "observability": {
    "logs": {
      "enabled": true,
      "head_sampling_rate": 1,
      "invocation_logs": true,
      "persist": true,
    },
    "traces": {
      "enabled": true,
      "head_sampling_rate": 1,
      "persist": true,
    },
  },
  "r2_buckets": [{ "binding": "BLOB", "bucket_name": "your-bucket-name" }],
  "vars": {
    "NUXT_OAUTH_GITHUB_CLIENT_ID": "xxxxx",
    "NUXT_OAUTH_GITHUB_CLIENT_SECRET": "xxxxx",
    "NUXT_ALLOWED_GITHUB_USER_IDS": "12345678,87654321",
    "NUXT_SESSION_PASSWORD": "xxxxx",
    "NUXT_ALLOWED_ORIGINS": "xxxxx",
  },
}
```

## 本地开发

1. 克隆与安装

- 要求：Node 20+、pnpm 10+（已在 `packageManager` 标注）。

```bash
git clone https://github.com/QuentinHsu/oh-cloudflare-r2.git
cd oh-cloudflare-r2
pnpm install
```

2. 配置环境变量（仅本地开发用 `.env`）

```bash
cp .env.example .env

# 编辑 .env，填入本地调试用的 GitHub OAuth、SESSION、ORIGIN 白名单
```

- 变量说明：
  - `NUXT_OAUTH_GITHUB_CLIENT_ID` / `NUXT_OAUTH_GITHUB_CLIENT_SECRET`
  - `NUXT_ALLOWED_GITHUB_USER_IDS`（必填，允许登录的 GitHub 数字 User ID，逗号分隔）
  - `NUXT_SESSION_PASSWORD`（至少 32 位，可用 `openssl rand -base64 32` 生成）
  - `NUXT_ALLOWED_ORIGINS`（可选，用逗号分隔，支持 `*.example.com`）

3. 本地开发

```bash
pnpm dev
```

访问：http://localhost:3000

## 环境变量速查

```bash
# 必填
NUXT_OAUTH_GITHUB_CLIENT_ID=your_github_client_id
NUXT_OAUTH_GITHUB_CLIENT_SECRET=your_github_client_secret
NUXT_ALLOWED_GITHUB_USER_IDS=12345678,87654321
NUXT_SESSION_PASSWORD=your_session_password_at_least_32_characters

# 可选
NUXT_ALLOWED_ORIGINS=https://example.com,https://app.example.com,https://*.example.com
```

> 提示：上述变量在本地开发可放 `.env`；部署时请改为 Cloudflare Secrets / `wrangler.jsonc` `vars`，以免泄露。

> 安全策略：`NUXT_ALLOWED_GITHUB_USER_IDS` 未配置、为空或包含无效值时，系统会拒绝所有 GitHub 用户。通过私有仓库嵌入本项目时，部署新版本前必须在根 `wrangler.jsonc` 中填入真实 GitHub 数字 User ID。

## 常用命令

```bash
# 开发
pnpm dev

# 构建
pnpm build

# 类型检查
pnpm typecheck

# OXC 代码检查与格式化
pnpm lint
pnpm lint:fix
pnpm format
pnpm format:check

# 完整质量检查
pnpm check

# 部署 Cloudflare（包含 NITRO_PRESET=cloudflare_module）
pnpm run deploy-cloudflare
```

## 项目结构（简版）

```
app/
├── components/          # shadcn-vue 及业务组件
├── pages/               # Nuxt 路由页面
├── layouts/             # 布局
└── middleware/          # 前端路由中间件

server/
├── api/                 # 文件/认证 API（R2 + OAuth）
└── middleware/          # CORS 等服务端中间件
```

## API 速览

- 文件：
  - `GET /api/files` — 列表
  - `GET /api/files/folders` — 文件夹路径
  - `POST /api/files/upload` — 上传
  - `POST /api/files/move` — 移动
  - `DELETE /api/files/[pathname]` — 删除
- 认证：
  - `GET /api/auth/session` — 获取会话
  - `POST /api/auth/logout` — 退出登录

## 技术栈

- Nuxt 4.2.2、Vue 3
- NuxtHub Blob (Cloudflare R2)
- nuxt-auth-utils（GitHub OAuth）
- shadcn-vue + Radix Vue + Tailwind CSS 4
- Lucide Vue Next、vue-sonner

- CI / 生产的密钥请在 Cloudflare Dashboard 或 CI Secret 管理，`.env` 仅限本地开发。

## 许可证

MIT License
