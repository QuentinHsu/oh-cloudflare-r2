import { useAPI } from '~~/utils/api'

export async function getVerify() {
  return useAPI('/api/verify').catch(async () => {
    return Promise.reject(
      new Error('Unauthorized'),
    )
  })
}
