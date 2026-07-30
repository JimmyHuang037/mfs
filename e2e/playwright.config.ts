import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: 1,
  outputDir: './test-results/output',
  use: {
    baseURL: 'http://localhost:4200',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  reporter: [
    ['html', { outputFolder: 'test-results/report' }],
    ['list'],
  ],
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
