import type { BlobListResult } from '@nuxthub/core'
import { schemaAPIBlobListOptions } from '~~/schema/api'

export interface IResponse {
  status: number
  message: string
  data: BlobListResult
}
export default eventHandler(async (event): Promise<IResponse> => {
  const listOptions = await getValidatedQuery(event, schemaAPIBlobListOptions.parse)

  return {
    status: 200,
    message: 'OK',
    data: await hubBlob().list(listOptions),
  }
})
