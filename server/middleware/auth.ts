export default eventHandler((event) => {
  const loginToken = String(getHeader(event, 'Authorization')?.replace('Bearer ', ''))
  const correctToken = String(useRuntimeConfig(event).loginToken)
  if (event.path.startsWith('/api/') && !event.path.startsWith('/api/_') && loginToken !== correctToken) {
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
