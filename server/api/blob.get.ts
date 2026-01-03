import type { BlobListResult } from '@nuxthub/core';
import { z } from 'zod';

const schemaAPIBlobListOptions = z.object({
  cursor: z.string().optional(),
  folded: z
    .string()
    .toLowerCase()
    .transform(x => x === 'true')
    .optional(),
  limit: z
    .string()
    .transform(x => Number.parseInt(x))
    .optional(),
  prefix: z
    .string()
    .optional()
    .transform(x => (x === '' ? undefined : x)),
});

export interface IResponse {
  status: number;
  message: string;
  data: BlobListResult;
}

export default eventHandler(async (event): Promise<IResponse> => {
  const listOptions = await getValidatedQuery(event, schemaAPIBlobListOptions.parse);

  return {
    data: await hubBlob().list(listOptions),
    message: 'OK',
    status: 200,
  };
});
