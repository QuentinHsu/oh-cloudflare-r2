import type { ApiFailure, FileErrorCode } from "../../shared/types/files";

function authorizationFailure(
  code: Extract<FileErrorCode, "UNAUTHORIZED" | "FORBIDDEN">,
): ApiFailure {
  return {
    ok: false,
    error: {
      code,
      message: code === "UNAUTHORIZED" ? "请先登录" : "无权执行此操作",
    },
  };
}

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname;
  const publicPaths = ["/api/auth/", "/api/blob/", "/_nuxt/", "/favicon.ico"];
  if (publicPaths.some((publicPath) => path.startsWith(publicPath))) return;
  if (!path.startsWith("/api/")) return;

  const session = await getUserSession(event);
  if (!session.user) {
    throw createError({ statusCode: 401, data: authorizationFailure("UNAUTHORIZED") });
  }
  if (session.authorized !== true) {
    throw createError({ statusCode: 403, data: authorizationFailure("FORBIDDEN") });
  }
});
