module.exports = {
  root: true,
  env: {
    browser: true,
    node: true
  },
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    project: 'tsconfig.json',
    extraFileExtensions: ['.vue'],
    tsconfigRootDir: __dirname
  },
  extends: ['@nuxtjs/eslint-config-typescript', 'plugin:prettier/recommended'],
  ignorePatterns: ['.eslintrc.cjs'],
  plugins: ['vue', '@typescript-eslint'],
  rules: {
    'max-params': ['warn', { max: 4 }],
    'max-nested-callbacks': ['warn', { max: 3 }],
    'vue/no-v-html': 'off',
    'vue/multi-word-component-names': 'off',
    'import/order': 'error',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'variable',
        types: ['boolean'],
        format: ['PascalCase'],
        prefix: ['is', 'should', 'has', 'can', 'did', 'will']
      },
      {
        selector: 'classProperty',
        format: ['camelCase']
      },
      {
        selector: 'function',
        format: ['camelCase']
      },
      {
        selector: 'class',
        format: ['PascalCase']
      }
    ],
    'max-depth': ['error', { max: 4 }]
  }
}
