import { defu } from 'defu';
import type { NitroFetchRequest } from 'nitropack';

interface FetchOptions {
  headers?: Record<string, string>;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: string | FormData;
  query?: Record<string, any>;
  [key: string]: any;
}

export interface APIResponse<T> {
  status: number;
  message: string;
  data: T;
}

export async function useAPI<T>(api: NitroFetchRequest, options?: FetchOptions): Promise<APIResponse<T>> {
  const storeLogin = useStoreLogin();

  return $fetch<APIResponse<T>>(
    api,
    defu(options || {}, {
      headers: {
        Authorization: `Bearer ${storeLogin.token || ''}`,
      },
    }),
  )
    .then(async response => {
      if (response.status > 201) {
        return Promise.reject(response);
      }
      return Promise.resolve(response);
    })
    .catch(async error => {
      console.error('[useAPI Catch]', error);
      return Promise.reject(error);
    });
}
