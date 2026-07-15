import { blob } from "hub:blob";

export default eventHandler(async (event) => {
  const pathname = getRouterParam(event, "pathname");

  if (!pathname) {
    throw createError({ statusCode: 400, message: "Pathname is required" });
  }

  setHeader(event, "Content-Security-Policy", "default-src 'none';");
  return blob.serve(event, pathname);
});
