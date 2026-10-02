import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';
import { testEnv } from './vitest.shared';

export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    globalSetup: ['./test/global-setup.ts'],
    env: testEnv,
    // O modo "sem metadata de decorators" tem a própria configuração (vitest.nometadata.config.ts)
    exclude: ['**/node_modules/**', 'test/nometadata/**'],
    fileParallelism: false,
    testTimeout: 20000,
  },
});
