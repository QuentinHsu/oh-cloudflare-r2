# UI 设计规范 - Cloudflare Dashboard 风格

本项目 UI 风格参考 Cloudflare Dashboard 控制台设计，追求专业、简洁、功能导向的企业级体验。

## 设计原则

1. **功能优先** - 界面服务于功能，避免过度装饰
2. **信息密度适中** - 合理利用空间，不过于稀疏也不拥挤
3. **一致性** - 组件、间距、颜色保持统一
4. **可访问性** - 确保足够的颜色对比度 (WCAG AA 标准 4.5:1)

## 颜色系统

### 主色调
- 主色: `#f6821f` (Cloudflare Orange) - 用于主要按钮、强调元素、文件夹图标
- 辅助色: `#2196f3` (Blue) - 用于链接、次要操作

### 背景色
- Light Mode: `#ffffff` 主背景, `#f9fafb` / `gray-50` 次级背景
- Dark Mode: `#0a0a0a` 页面背景, `#111` 卡片/侧边栏背景, `#1a1a1a` hover 背景

### 文字色
- Light Mode: `gray-900` 主文字, `gray-500` 次级文字, `gray-400` 辅助文字
- Dark Mode: `white` 主文字, `gray-400` 次级文字, `gray-500` 辅助文字

### 边框色
- Light Mode: `gray-200`
- Dark Mode: `#333`

### 分割线
- Light Mode: `gray-100`
- Dark Mode: `#222`

## 布局规范

### 侧边栏
- 宽度: 256px (w-64)
- 背景: `white` / `#111`
- 包含: Logo、搜索框、导航菜单、用户信息
- 导航项: 左侧图标 + 文字，hover 时背景变化
- 当前选中项: 背景高亮 + 图标变橙色
- 分组标题: 小写字母，`text-xs`，`gray-400/500`

### 顶部栏
- 高度: 56px (h-14)
- 背景: `white` / `#111`
- 包含: 面包屑导航、操作按钮
- sticky 定位

### 内容区
- 内边距: 24px (p-6)
- 背景: `gray-50` / `#0a0a0a`

## 组件规范

### 按钮
- 主按钮: 橙色背景 `#f6821f`, 白色文字
- 次要按钮: 透明背景, 边框样式
- 危险按钮: 红色系
- 圆角: 6px (rounded-md)
- 尺寸: small 为主

### 卡片/表格
- 背景: `white` / `#111`
- 边框: 1px solid `gray-200` / `#333`
- 圆角: 8px (rounded-lg)
- 表头背景: `gray-50` / `#0a0a0a`

### 表格/列表
- 行高: 48px (py-3)
- hover 效果: `gray-50` / `#1a1a1a`
- 分割线: `gray-100` / `#222`

### 图标
- 使用 Phosphor Icons (ph:*)
- 尺寸: `text-sm` (14px), `text-base` (16px), `text-lg` (18px)
- 颜色: 与文字颜色协调，文件夹用橙色

### 输入框
- 边框: 1px solid
- 圆角: 6px
- focus 状态: 边框变为主色

## 字体规范

- 字体族: 系统字体栈
- 标题: `font-semibold` (600)
- 正文: `font-normal` (400)
- 字号:
  - 页面标题: `text-base` (16px)
  - 正文: `text-sm` (14px)
  - 辅助文字: `text-xs` (12px)

## 交互规范

- 过渡动画: 75ms (duration-75)
- hover 状态: 明确但不夸张
- 操作按钮: 默认隐藏，hover 时显示

## 避免的设计

- ❌ 过大的圆角 (rounded-xl, rounded-2xl)
- ❌ 渐变背景 (除了用户头像)
- ❌ 过多的阴影
- ❌ 过于鲜艳的配色
- ❌ 过度的动画效果
- ❌ 纯黑背景 (#000000)

## 参考

- [Cloudflare Dashboard](https://dash.cloudflare.com)
