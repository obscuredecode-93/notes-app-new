import tseslint from '@typescript-eslint/eslint-plugin';
import parser  from '@typescript-eslint/parser';

export default [
  {
    files:    ['src/**/*.ts'],
    ignores:  ['dist/**', 'node_modules/**'],
    languageOptions: {
      parser,
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      // Spread recommended rules without requiring type-aware parsing
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any':  'error',
      '@typescript-eslint/no-unused-vars':   ['error', { argsIgnorePattern: '^_' }],
      // Allow console.log in a Node.js backend
      'no-console': 'off',
    },
  },
];
