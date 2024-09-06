import { z } from 'zod'

export default eventHandler(async (event) => {
  const { pathnames } = await readValidatedBody(event, z.object({
    pathnames: z.array(z.string().min(1)).min(1),
  }).parse)

  await hubBlob().delete(pathnames)

  return {
    status: 200,
    message: 'OK',
    data: `Deleted ${pathnames.length} blobs`,
  }
})
