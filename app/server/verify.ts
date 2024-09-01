import { useAPI } from '~~/utils/api'

export async function getVerify() {
  return useAPI('/api/verify')
}
