// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'ios/*', 'android/*', 'coverage/*'],
  },
  {
    rules: {
      // Regras do projeto: arquivos até 500 linhas, funções até 80 linhas.
      'max-lines': ['error', { max: 500, skipBlankLines: false, skipComments: false }],
      'max-lines-per-function': ['error', { max: 80, skipBlankLines: false, skipComments: false, IIFEs: true }],
    },
  },
  {
    files: ['**/__tests__/**', '**/*.test.ts', '**/*.test.tsx'],
    rules: { 'max-lines-per-function': 'off' },
  },
]);
