import antfu from '@antfu/eslint-config'

export default antfu({
  typescript: {
    tsconfigPath: 'tsconfig.json',
  },
  formatters: {
    css: true,
    html: true,
    markdown: 'prettier',
  },
})
