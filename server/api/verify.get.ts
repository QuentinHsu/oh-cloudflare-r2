export default eventHandler(() => {
  const config = useRuntimeConfig();
  return {
    message: `Welcome to ${config.public.siteName}!`,
    status: 200,
  };
});
