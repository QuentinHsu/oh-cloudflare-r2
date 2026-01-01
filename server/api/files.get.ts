export default defineEventHandler(async event => {
  await verifyAuth(event);

  const query = getQuery(event);
  const prefix = (query.prefix as string) || '';

  return hubBlob().list({ prefix });
});
