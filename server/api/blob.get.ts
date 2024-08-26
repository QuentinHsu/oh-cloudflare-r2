import { schemaAPIBlobListOptions } from '~~/schema/api'

export default eventHandler(async (event) => {
  const listOptions = await getValidatedQuery(event, schemaAPIBlobListOptions.parse)

  return hubBlob().list(listOptions)
})
