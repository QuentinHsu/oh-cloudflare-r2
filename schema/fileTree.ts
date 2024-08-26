import { z } from 'zod'

export const schemaFileTreeNode = z.object({
  name: z.string(),
  path: z.string(),
  id: z.string().uuid().optional(),
  parentId: z.string().uuid().optional(),
})
