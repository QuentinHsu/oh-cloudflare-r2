# Oh Cloudflare R2

Manage your Cloudflare R2 Blob Storage

## 如何使用

1. 将 fork 本项目并发布在 Cloudflare pages
2. 在 Cloudflare pages 中该项目的【设置】里

   i. 设置 - 环境变量

   - `NUXT_LOGIN_TOKEN`：面板登录密码，8 位以上，不建议纯数字

   ii. 设置 - 函数 - R2 存储桶绑定

   - `BLOB`: 存储桶字段，然后绑定对应的存储桶
