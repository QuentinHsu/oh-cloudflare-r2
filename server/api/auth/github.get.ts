export default defineOAuthGitHubEventHandler({
  onError(event, error) {
    console.error('GitHub OAuth error:', error);
    return sendRedirect(event, '/login?error=oauth');
  },
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        avatar_url: user.avatar_url,
        id: user.id,
        login: user.login,
      },
    });
    return sendRedirect(event, '/');
  },
});
