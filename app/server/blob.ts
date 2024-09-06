import type { BlobListResult } from '@nuxthub/core'
import type { z } from 'zod'
import type { schemaAPIBlobListOptions } from '~~/schema/api'
import type { APIResponse } from '~~/utils/api'
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

export async function postDeleteFolder(prefix: string): Promise<APIResponse<void>> {
  const body = JSON.stringify({ prefix })

  return useAPI<void>('/api/blob/delete-folder', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
  })
}

export async function postDeleteBlob(pathnames: string[]): Promise<APIResponse<void>> {
  const body = JSON.stringify({ pathnames })

  return useAPI<void>('/api/blob/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
  })
}
