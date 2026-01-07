import { blob } from 'hub:blob';

export default defineEventHandler(async event => {
  const pathname = getRouterParam(event, 'pathname');

  if (!pathname) {
    throw createError({ message: 'Pathname is required', statusCode: 400 });
  }

  await blob.delete(pathname);
  return { success: true };
});
