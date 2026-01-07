import { blob } from 'hub:blob'

export default eventHandler(async (event) => {
  const pathname = getRouterParam(event, 'pathname')

  if (!pathname) {
    throw createError({ statusCode: 400, message: 'Pathname is required' })
  }

  await blob.delete(pathname)
  return { success: true }
})
