export default defineNuxtRouteMiddleware(async () => {
  const { loggedIn, session } = useUserSession();

  if (!loggedIn.value) {
    return navigateTo("/login");
  }

  if (session.value?.authorized !== true) {
    return navigateTo("/login?error=unauthorized");
  }
});
