import { z } from "zod";

export const schemaAPIBlobListOptions = z.object({
  folded: z.string().toLowerCase().transform(x => x === 'true').optional(),
  limit: z.string().transform(x => Number.parseInt(x)).optional(),
  prefix: z.string().optional(),
  cursor: z.string().optional(),
})