# R2 Dashboard

现代化的 Cloudflare R2 文件管理面板，基于 Nuxt 4 构建。

## 快速开始（模板使用）

### 1. 使用模板创建项目

```bash
# 克隆模板
git clone https://github.com/your-username/r2-dashboard.git my-r2-dashboard
cd my-r2-dashboard

# 移除原有 git 历史（可选，如果想作为独立项目）
rm -rf .git && git init

# 安装依赖
pnpm install
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env
```

编辑 `.env` 文件，填写以下配置：

```bash
# GitHub OAuth（必填）
NUXT_OAUTH_GITHUB_CLIENT_ID=your_client_id
NUXT_OAUTH_GITHUB_CLIENT_SECRET=your_client_secret

# Session 密钥（必填，至少 32 位）
NUXT_SESSION_PASSWORD=$(openssl rand -base64 32)

# 域名访问控制（可选）
NUXT_ALLOWED_ORIGINS=https://your-domain.com
```

### 3. 配置 Cloudflare（生产部署）

```bash
# 复制 wrangler 配置模板
cp wrangler.jsonc.example wrangler.jsonc
```

编辑 `wrangler.jsonc`：
- 修改 `r2_buckets[0].bucket_name` 为你的 R2 存储桶名称
- 在 Cloudflare Dashboard 中配置环境变量（推荐），或在 `vars` 中填写

### 4. 启动开发

```bash
pnpm dev
```

访问 http://localhost:3000

---

## 功能特性

### 文件管理
- 文件上传到 Cloudflare R2 存储
- 虚拟文件夹层级展示（基于路径前缀）
- 文件预览（支持图片格式）
- 文件移动和删除
- 批量文件操作（移动、删除）
- 文件夹树形导航
- 面包屑路径导航

### URL 复制功能
- 纯 URL 复制：`https://domain.com/api/blob/file.png`
- Markdown 格式复制：`![filename](https://domain.com/api/blob/file.png)`

### 用户认证
- GitHub OAuth 登录集成
- Session 管理
- 路由保护中间件

### 安全控制
- 域名访问限制：可配置允许访问文件资源的域名白名单
- 支持通配符子域名（如 `*.example.com`）
- 严格的 Origin 检查机制

### 界面体验
- 深浅色主题切换（light / dark / system）
- 现代化 UI 设计（基于 shadcn-vue）
- 响应式布局
- Toast 通知提示

## 技术栈

- **框架**: Nuxt 4.2.2
- **存储**: NuxtHub Blob (Cloudflare R2)
- **认证**: nuxt-auth-utils
- **UI 组件**: shadcn-vue + Radix Vue
- **样式**: Tailwind CSS 4
- **图标**: Lucide Vue Next
- **主题**: @nuxtjs/color-mode
- **通知**: vue-sonner

## 环境配置

1. 复制环境变量文件：
```bash
cp .env.example .env
```

2. 配置 GitHub OAuth：
   - 访问 [GitHub Developer Settings](https://github.com/settings/developers)
   - 创建新的 OAuth App
   - Authorization callback URL: `http://localhost:3000/api/auth/github`
   - 填写 `.env` 文件中的相关配置

3. 生成 Session 密钥：
```bash
# 生成至少 32 位的随机字符串
openssl rand -base64 32
```

4. 配置域名访问限制（可选）：
   - `NUXT_ALLOWED_ORIGINS`: 允许访问文件资源的域名白名单
   - 支持多个域名，用逗号分隔：`https://example.com,https://app.example.com`
   - 支持通配符子域名：`*.example.com`
   - 留空则不限制访问

### 环境变量说明

```bash
# GitHub OAuth 配置
NUXT_OAUTH_GITHUB_CLIENT_ID=your_github_client_id
NUXT_OAUTH_GITHUB_CLIENT_SECRET=your_github_client_secret

# Session 密钥（至少 32 位）
NUXT_SESSION_PASSWORD=your_session_password_at_least_32_characters

# 域名访问控制（可选）
NUXT_ALLOWED_ORIGINS=https://example.com,https://app.example.com
```

## 安装依赖

```bash
pnpm install
```

## 开发服务器

启动开发服务器（默认端口 3000）：

```bash
pnpm dev
```

## 构建部署

### 生产构建

```bash
pnpm build
```

### Cloudflare 部署

```bash
pnpm run deploy-cloudflare
```

Wrangler 会自动在你的 Cloudflare 账户中创建必要的资源。

### Vercel 部署

```bash
pnpm run deploy-vercel
```

需要在 Vercel 控制台创建相应的存储资源并关联到项目。

## 项目结构

```
app/
├── components/
│   ├── ui/              # shadcn 组件库
│   ├── FileManager.vue  # 文件管理主组件
│   └── ThemeToggle.vue  # 主题切换组件
├── pages/
│   └── index.vue        # 主页面
├── layouts/
│   └── default.vue      # 默认布局
└── middleware/
    └── auth.ts          # 认证中间件

server/
├── api/
│   ├── auth/            # 认证相关 API
│   │   ├── session.get.ts
│   │   └── logout.post.ts
│   └── files/           # 文件管理 API
│       ├── index.get.ts      # 文件列表
│       ├── folders.get.ts    # 文件夹列表
│       ├── upload.post.ts    # 文件上传
│       ├── move.post.ts      # 文件移动
│       └── [...pathname].delete.ts  # 文件删除
└── middleware/
    └── cors.ts          # CORS 中间件
```

## API 接口

### 文件管理
- `GET /api/files` - 获取文件和文件夹列表
- `GET /api/files/folders` - 获取所有文件夹路径
- `POST /api/files/upload` - 上传文件
- `POST /api/files/move` - 移动文件
- `DELETE /api/files/[pathname]` - 删除文件

### 用户认证
- `GET /api/auth/session` - 获取当前会话
- `POST /api/auth/logout` - 退出登录

## 许可证

MIT License

---

## 作为子模块使用

如果你想将此模板作为子仓库引入到现有项目中：

```bash
# 在你的主项目中添加子模块
git submodule add https://github.com/your-username/r2-dashboard.git r2-dashboard

# 创建个人配置文件（不会被提交到模板仓库）
cd r2-dashboard
cp .env.example .env
cp wrangler.jsonc.example wrangler.jsonc
# 编辑 .env 和 wrangler.jsonc 填写你的配置
```

### 更新模板

```bash
# 拉取模板更新
git submodule update --remote r2-dashboard
```

### 个人配置管理建议

在主项目中创建配置文件，通过符号链接或环境变量注入：

```bash
# 主项目结构示例
my-project/
├── r2-dashboard/          # 子模块（模板代码）
├── configs/
│   ├── r2-dashboard.env   # 你的个人 .env 配置
│   └── wrangler.jsonc     # 你的个人 wrangler 配置
└── setup.sh               # 配置链接脚本
```

`setup.sh` 示例：
```bash
#!/bin/bash
ln -sf ../configs/r2-dashboard.env r2-dashboard/.env
ln -sf ../configs/wrangler.jsonc r2-dashboard/wrangler.jsonc
```
