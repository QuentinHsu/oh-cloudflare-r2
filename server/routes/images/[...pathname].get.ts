import { blob } from 'hub:blob';

export default defineEventHandler(event => {
  const { pathname } = event.context.params || {};

  setHeader(event, 'Content-Security-Policy', "default-src 'none';");
  return blob.serve(event, pathname);
});
