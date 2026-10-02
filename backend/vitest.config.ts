import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    env: {
      // DATABASE_URL = dono (fixtures, ignora RLS). APP_DATABASE_URL = papel da API (sujeito a RLS).
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgres://disc:disc@localhost:5432/disc_test',
      APP_DATABASE_URL: process.env.TEST_APP_DATABASE_URL ?? 'postgres://disc_app:disc_app@localhost:5432/disc_test',
      PRESENTATION_DAILY_LIMIT: '100000', // testes criam muitas empresas; o teste do limite define o próprio valor
      NODE_ENV: 'test',
    },
    fileParallelism: false,
    testTimeout: 20000,
  },
});
