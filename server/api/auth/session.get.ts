export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  return session;
});
