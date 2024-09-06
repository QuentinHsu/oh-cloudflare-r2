import { z } from 'zod'

export default eventHandler(async (event) => {
  const { prefix } = await readValidatedBody(event, z.object({
    prefix: z.string().min(1),
  }).parse)

  const blob = hubBlob()

  let cursor: string | undefined
  const pathnames = []

  do {
    const blobs = await blob.list({ prefix, limit: 1000, cursor })
    pathnames.push(...blobs.blobs.map(blob => blob.pathname))
    cursor = blobs.cursor
  } while (typeof cursor === 'string' && cursor.length > 0)

  await blob.delete(pathnames)

  return {
    status: 200,
    message: 'OK',
    data: `Deleted ${pathnames.length} blobs`,
  }
})
