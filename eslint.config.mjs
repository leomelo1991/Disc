import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/generated/**',
      '**/.turbo/**',
      '**/coverage/**',
      'e2e/test-results/**',
      'e2e/playwright-report/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Não habilitar consistent-type-imports: no NestJS o tipo do parâmetro do construtor precisa ser import de valor (injeção por metadata).
      eqeqeq: ['error', 'always'],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['backend/**/*.ts', 'packages/**/*.ts', 'e2e/**/*.ts', '*.mjs', '*.cjs'],
    languageOptions: { globals: globals.node },
  },
  // Scripts de seed e o main podem usar console para saída de CLI
  { files: ['backend/prisma/**/*.ts'], rules: { 'no-console': 'off' } },
  {
    files: ['frontend/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  prettier,
);
