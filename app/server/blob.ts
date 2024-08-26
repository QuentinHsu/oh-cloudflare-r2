import type { BlobListResult } from '@nuxthub/core'
import type { z } from 'zod'
import type { schemaAPIBlobListOptions } from '~~/schema/api'

/**
 * Get a list of blobs
 * @param listOptions
 * @returns A list of blobs
 */
export async function getBlobList(listOptions: z.infer<typeof schemaAPIBlobListOptions>): Promise<BlobListResult> {
  return $fetch('/api/blob', {
    method: 'GET',
    query: listOptions,
  })
}
