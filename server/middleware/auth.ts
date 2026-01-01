export default eventHandler(event => {
  const loginToken = String(getHeader(event, 'Authorization')?.replace('Bearer ', ''));
  const correctToken = String(useRuntimeConfig(event).loginToken);

  if (event.path.startsWith('/api/') && !event.path.startsWith('/api/_') && loginToken !== correctToken) {
    throw createError({
      message: 'Unauthorized',
      stack: '',
      status: 401,
    });
  }

  if (loginToken != null && loginToken.length < 8) {
    throw createError({
      message: 'Token is too short!',
      status: 401,
    });
  }
});
