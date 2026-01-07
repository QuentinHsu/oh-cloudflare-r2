export default defineEventHandler(async event => {
  const path = getRequestURL(event).pathname;

  // 跳过公开路由
  const publicPaths = ['/api/auth/', '/api/blob/', '/_nuxt/', '/favicon.ico'];
  if (publicPaths.some(p => path.startsWith(p))) {
    return;
  }

  // API 路由需要鉴权
  if (path.startsWith('/api/')) {
    const session = await getUserSession(event);
    if (!session.user) {
      throw createError({ message: 'Unauthorized', statusCode: 401 });
    }
  }
});
