export default eventHandler(async (event) => {
  interface IQuery {
    prefix: string
  }
  const query = getQuery(event)
  const { prefix }: IQuery = query as unknown as IQuery
  const { blobs } = await hubBlob().list({ prefix })

  return blobs
})
