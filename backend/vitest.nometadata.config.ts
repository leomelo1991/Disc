import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';
import { testEnv } from './vitest.shared';

/**
 * Roda o app SEM `emitDecoratorMetadata`, como carregadores baseados em esbuild (CLI da Vercel, tsx) o fariam.
 * Se algum construtor injetável perder o `@Inject(...)` explícito, a injeção por tipo quebra e esta suíte falha.
 */
export default defineConfig({
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: { transform: { legacyDecorator: true, decoratorMetadata: false } },
    }),
  ],
  test: {
    globalSetup: ['./test/global-setup.ts'],
    include: ['test/nometadata/**/*.test.ts'],
    env: testEnv,
    fileParallelism: false,
    testTimeout: 20000,
  },
});
