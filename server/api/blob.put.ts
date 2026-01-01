export default eventHandler(async event => {
  const query = getQuery(event);
  const prefix = (query.prefix as string) || '';

  return hubBlob().handleUpload(event, {
    put: {
      addRandomSuffix: false,
      prefix,
    },
  });
});
