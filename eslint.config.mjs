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
}).overrideRules({
  'no-console': ['error', { allow: ['info', 'warn', 'error'] }],
  'ts/unbound-method': 'off',
  'ts/no-unsafe-assignment': 'off',
})
