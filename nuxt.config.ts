// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-07-30',
  // https://nuxt.com/docs/getting-started/upgrade#testing-nuxt-4
  future: { compatibilityVersion: 4 },

  // https://nuxt.com/modules
  modules: [
    '@nuxthub/core',
    '@tdesign-vue-next/nuxt',
    '@nuxtjs/color-mode',
  ],
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
  },
  // https://hub.nuxt.com/docs/getting-started/installation#options
  hub: {
    blob: true,
  },

  // Env variables - https://nuxt.com/docs/getting-started/configuration#environment-variables-and-private-tokens
  runtimeConfig: {
    public: {
      // Can be overridden by NUXT_PUBLIC_HELLO_TEXT environment variable
      helloText: 'Hello from the Edge 👋',
    },
  },

  // https://eslint.nuxt.com

  // https://devtools.nuxt.com
  devtools: { enabled: true },
})
