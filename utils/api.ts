import { defu } from 'defu'
import type { NitroFetchRequest } from 'nitropack'
import { useStoreLogin } from '~/stores/useStoreLogin'

interface FetchOptions {
  headers?: Record<string, string>
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: string | FormData
  [key: string]: any
}

interface APIResponse<T> {
  status: number
  message: string
  data: T
}

interface ErrorResponse {
  data: {
    message: string
    [key: string]: any
  }
  [key: string]: any
}

/**
 * Custom hook to make API calls with proper authentication and error handling.
 *
 * @param api - The API endpoint to fetch.
 * @param options - Optional fetch options.
 * @returns A promise resolving to the API response or rejecting with an error.
 */
export async function useAPI<T>(api: NitroFetchRequest, options?: FetchOptions): Promise<APIResponse<T>> {
  const storeLogin = useStoreLogin()

  return $fetch<APIResponse<T>>(api, defu(options || {}, {
    headers: {
      Authorization: `Bearer ${storeLogin.token || ''}`,
    },
  }))
    .then(async (response) => {
      if (response.status > 201) {
        return Promise.reject(response)
      }
      else {
        return Promise.resolve(response)
      }
    })
    .catch(async (error: ErrorResponse) => {
      console.error('[useAPI Catch]', error)
      return Promise.reject(error)
    })
}
