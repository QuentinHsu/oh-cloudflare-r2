# UI 设计规范 - Cloudflare Dashboard 风格

本项目 UI 风格参考 Cloudflare Dashboard 控制台设计，追求专业、简洁、功能导向的企业级体验。

## 设计原则

1. **功能优先** - 界面服务于功能，避免过度装饰
2. **信息密度适中** - 合理利用空间，不过于稀疏也不拥挤
3. **一致性** - 组件、间距、颜色保持统一
4. **可访问性** - 确保足够的颜色对比度 (WCAG AA 标准 4.5:1)

## 颜色系统

### 主色调
- 主色: `#f6821f` (Cloudflare Orange) - 用于主要按钮、强调元素
- 辅助色: `#2196f3` (Blue) - 用于链接、次要操作

### 背景色
- Light Mode: `#ffffff` 主背景, `#f5f5f5` 次级背景
- Dark Mode: `#1d1d1d` 主背景 (非纯黑), `#2a2a2a` 次级背景

### 文字色
- Light Mode: `#1a1a1a` 主文字, `#6b7280` 次级文字
- Dark Mode: `#f5f5f5` 主文字, `#9ca3af` 次级文字

### 边框色
- Light Mode: `#e5e5e5`
- Dark Mode: `#404040`

## 布局规范

### 侧边栏
- 宽度: 240px (可折叠至 64px)
- 背景: 纯色，与主内容区有明显区分
- 导航项: 左侧图标 + 文字，hover 时背景变化
- 当前选中项: 左侧边框指示器或背景高亮

### 顶部栏
- 高度: 56px
- 包含: 面包屑导航、操作按钮
- 背景: 与内容区一致或略有区分

### 内容区
- 内边距: 24px - 32px
- 卡片间距: 16px - 24px

## 组件规范

### 按钮
- 主按钮: 橙色背景 `#f6821f`, 白色文字
- 次要按钮: 透明背景, 边框样式
- 危险按钮: 红色系 `#dc2626`
- 圆角: 6px (不要过大的圆角)
- 高度: 32px (small), 36px (default), 40px (large)

### 卡片
- 背景: 白色 / 深色模式下 `#2a2a2a`
- 边框: 1px solid, 颜色淡
- 圆角: 8px
- 阴影: 极淡或无阴影 (Cloudflare 风格偏平面)

### 表格/列表
- 行高: 48px - 56px
- hover 效果: 背景色轻微变化
- 分割线: 细线 1px

### 图标
- 使用线性图标 (outline style)
- 尺寸: 16px (small), 20px (default), 24px (large)
- 颜色: 与文字颜色协调

### 输入框
- 高度: 36px
- 边框: 1px solid
- 圆角: 6px
- focus 状态: 边框变为主色

## 字体规范

- 字体族: 系统字体栈 (Inter, -apple-system, sans-serif)
- 标题: 600 weight
- 正文: 400 weight
- 字号:
  - 页面标题: 24px
  - 卡片标题: 16px
  - 正文: 14px
  - 辅助文字: 12px

## 交互规范

- 过渡动画: 150ms - 200ms, ease-out
- hover 状态: 明确但不夸张
- loading 状态: 使用 spinner 或骨架屏
- 空状态: 简洁图标 + 说明文字

## 避免的设计

- ❌ 过大的圆角 (如 rounded-2xl, rounded-3xl)
- ❌ 渐变背景 (除非是品牌元素)
- ❌ 过多的阴影层次
- ❌ 过于鲜艳的配色
- ❌ 过度的动画效果
- ❌ 纯黑背景 (#000000)

## 参考

- [Cloudflare Dashboard](https://dash.cloudflare.com)
- [Cloudflare Design System](https://blog.cloudflare.com/dark-mode/)
