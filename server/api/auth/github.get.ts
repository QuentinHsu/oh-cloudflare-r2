export default defineOAuthGitHubEventHandler({
  async onSuccess(event, { user }) {
    const cloudflareEnv = event.context.cloudflare?.env as Record<string, string> | undefined;
    const allowedGithubUserIds =
      cloudflareEnv?.NUXT_ALLOWED_GITHUB_USER_IDS ?? useRuntimeConfig(event).allowedGithubUserIds;

    if (!isGithubUserAllowed(user.id, allowedGithubUserIds)) {
      await clearUserSession(event);
      return sendRedirect(event, "/login?error=unauthorized");
    }

    await setUserSession(event, {
      authorized: true,
      user: {
        id: user.id,
        login: user.login,
        avatar_url: user.avatar_url,
      },
    });
    return sendRedirect(event, "/");
  },
  onError(event, error) {
    console.error("GitHub OAuth error:", error);
    return sendRedirect(event, "/login?error=oauth");
  },
});
