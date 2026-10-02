import { defineConfig, devices } from '@playwright/test';

const API = 'http://localhost:3100';
const WEB = 'http://localhost:5174';
const TEST_DB = process.env.TEST_DATABASE_URL ?? 'postgres://disc:disc@localhost:5432/disc_test';
const TEST_APP_DB = process.env.TEST_APP_DATABASE_URL ?? 'postgres://disc_app:disc_app@localhost:5432/disc_test';

export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  use: { baseURL: WEB, trace: 'retain-on-failure', reducedMotion: 'reduce' },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'pnpm --filter @disc/backend build && pnpm --filter @disc/backend start',
      url: `${API}/api/v1/health`,
      reuseExistingServer: false,
      env: {
        PORT: '3100',
        DATABASE_URL: TEST_DB,
        APP_DATABASE_URL: TEST_APP_DB,
        WEB_ORIGIN: WEB,
        NODE_ENV: 'test',
        PRESENTATION_DAILY_LIMIT: '100000',
      },
    },
    {
      command: 'pnpm --filter @disc/frontend exec vite --port 5174 --strictPort',
      url: WEB,
      reuseExistingServer: false,
      env: { API_URL: API, VITE_DEMO_EMAIL: 'demo@aurora.example', VITE_DEMO_PASSWORD: 'demo-disc-2026' },
    },
  ],
});
