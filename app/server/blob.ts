import type { BlobListResult } from '@nuxthub/core'
import type { z } from 'zod'
import type { schemaAPIBlobListOptions } from '~~/schema/api'
import { useAPI } from '~~/utils/api'
import type { IResponse } from '~~/server/api/blob.get'

/**
 * Get a list of blobs
 * @param listOptions
 * @returns A list of blobs
 */
export async function getBlobList(listOptions: z.infer<typeof schemaAPIBlobListOptions>): Promise<IResponse> {
  return useAPI<BlobListResult>('/api/blob', {
    method: 'GET',
    query: listOptions,
  })
}
