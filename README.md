# Oh Cloudflare R2

管理你的 Cloudflare R2 Blob 存储

## 部署

1. Fork 本项目并部署到 Cloudflare Pages
2. 在 Cloudflare Pages 项目设置中配置:

   **环境变量:**
   - `NUXT_LOGIN_TOKEN`: 登录密钥 (8位以上)

   **R2 存储桶绑定:**
   - 变量名: `BLOB`
   - 绑定你的 R2 存储桶

## 本地开发

```bash
pnpm install
pnpm dev
```

## 技术栈

- Nuxt 4
- NuxtHub (Blob Storage)
- TDesign Vue Next
- UnoCSS
- Pinia
- Biome
