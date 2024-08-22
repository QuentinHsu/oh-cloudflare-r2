export default eventHandler(async (event) => {
  interface IQuery {
    prefix: string
    addRandomSuffix: '0' | '1'
  }
  const query = getQuery(event)
  const { prefix, addRandomSuffix }: IQuery = query as unknown as IQuery
  return hubBlob().handleUpload(event, {
    formKey: 'files', // read file or files form the `formKey` field of request body (body should be a `FormData` object)
    multiple: true, // when `true`, the `formKey` field will be an array of `Blob` objects
    ensure: {
      types: ['blob'], // allowed types of the file
    },
    put: {
      addRandomSuffix: !!addRandomSuffix,
      prefix,
    },
  })
})
