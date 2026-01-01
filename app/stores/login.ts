export const useStoreLogin = defineStore(
  'login',
  () => {
    const token = ref<string>('');

    async function login(newToken: string) {
      token.value = newToken;
      return newToken;
    }

    function logout() {
      token.value = '';
    }

    return { login, logout, token };
  },
  {
    persist: true,
  },
);
