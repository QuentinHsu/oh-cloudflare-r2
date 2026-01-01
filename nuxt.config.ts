export default defineNuxtConfig({
  app: {
    pageTransition: { mode: 'out-in', name: 'page' },
  },

  colorMode: {
    classSuffix: '',
  },
  compatibilityDate: '2025-01-01',

  devtools: { enabled: true },

  hub: {
    blob: true,
  },

  modules: [
    '@nuxthub/core',
    '@tdesign-vue-next/nuxt',
    '@nuxtjs/color-mode',
    '@nuxt/icon',
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
    '@unocss/nuxt',
  ],

  pinia: {
    storesDirs: ['./stores'],
  },

  runtimeConfig: {
    loginToken: 'your-secure-token-here',
    public: {
      loginTokenLength: 8,
      siteName: 'Oh Cloudflare R2',
    },
  },
});
