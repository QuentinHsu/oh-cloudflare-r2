import { getRequestOrigin, isOriginAllowed, parseAllowedOrigins } from "../utils/origin-policy";

export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname;
  if (!path.startsWith("/images/") && !path.startsWith("/api/blob/")) return;

  const cloudflareEnv = event.context.cloudflare?.env as Record<string, string> | undefined;
  const configuredOrigins =
    cloudflareEnv?.NUXT_ALLOWED_ORIGINS || (useRuntimeConfig().allowedOrigins as string);
  const allowedOrigins = parseAllowedOrigins(configuredOrigins);
  if (!allowedOrigins.length) return;

  const requestOrigin = getRequestOrigin(getHeader(event, "origin"), getHeader(event, "referer"));
  if (!requestOrigin || !isOriginAllowed(requestOrigin, allowedOrigins)) {
    throw createError({ statusCode: 403, message: "Forbidden: Origin not allowed" });
  }
});
