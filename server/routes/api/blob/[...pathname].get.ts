import { blob } from 'hub:blob';

export default defineEventHandler(event => {
  const pathname = getRouterParam(event, 'pathname');

  if (!pathname) {
    throw createError({ message: 'Pathname is required', statusCode: 400 });
  }

  return blob.serve(event, pathname);
});
