export default defineEventHandler((event) => {
  // 对 /images/ 和 /api/blob/ 路径生效
  const path = getRequestURL(event).pathname
  if (!path.startsWith('/images/') && !path.startsWith('/api/blob/')) {
    return
  }

  // 优先从 Cloudflare env 读取，再从 runtimeConfig 读取
  const cloudflareEnv = event.context.cloudflare?.env as Record<string, string> | undefined
  const allowedOrigins = cloudflareEnv?.NUXT_ALLOWED_ORIGINS
    || useRuntimeConfig().allowedOrigins as string

  if (!allowedOrigins) {
    // 未配置则不限制
    return
  }

  const origins = allowedOrigins.split(',').map(o => o.trim()).filter(Boolean)
  if (origins.length === 0) {
    return
  }

  // 检查 Origin 或 Referer
  const origin = getHeader(event, 'origin')
  const referer = getHeader(event, 'referer')


  const requestOrigin = origin || (referer ? new URL(referer).origin : null)

  if (!requestOrigin) {
    // 严格模式：无来源信息时拒绝
    throw createError({
      statusCode: 403,
      message: 'Forbidden: Origin required',
    })
  }

  const isAllowed = origins.some((allowed) => {
    if (allowed === '*') return true
    // 支持通配符子域名，如 *.example.com
    if (allowed.startsWith('*.')) {
      const domain = allowed.slice(2)
      const requestHost = new URL(requestOrigin).host
      return requestHost === domain || requestHost.endsWith('.' + domain)
    }
    return requestOrigin === allowed || requestOrigin === allowed.replace(/\/$/, '')
  })

  if (!isAllowed) {
    throw createError({
      statusCode: 403,
      message: 'Forbidden: Origin not allowed',
    })
  }
})
