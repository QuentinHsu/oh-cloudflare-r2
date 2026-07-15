import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  runtimeConfig: {
    // 允许加载资源的域名，逗号分隔，如: https://example.com,https://app.example.com
    // 支持通配符: *.example.com
    // 留空则不限制
    allowedOrigins: '',
  },

  modules: [
    '@nuxthub/core',
    '@nuxtjs/color-mode',
    'nuxt-auth-utils',
    'shadcn-nuxt',
  ],

  devtools: { enabled: true },
  compatibilityDate: '2025-12-11',

  css: ['~/assets/css/main.css'],

  hub: {
    blob: true,
  },

  colorMode: {
    classSuffix: '',
    preference: 'system',
    fallback: 'light',
  },

  shadcn: {
    prefix: '',
    componentDir: './app/components/ui',
  },

  vite: {
    plugins: [tailwindcss()],
  },
})
