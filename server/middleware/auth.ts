export default eventHandler((event) => {
  const loginToken = getHeader(event, 'Authorization')?.replace('Bearer ', '')
  if (event.path.startsWith('/api/') && !event.path.startsWith('/api/_') && loginToken !== useRuntimeConfig(event).loginToken) {
    throw createError({
      status: 401,
      message: 'Unauthorized',
      stack: '',
    })
  }
  if ((loginToken != null) && loginToken.length < 8) {
    throw createError({
      status: 401,
      message: 'Token is too short!',
    })
  }
})
