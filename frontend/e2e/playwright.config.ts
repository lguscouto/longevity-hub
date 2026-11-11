import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  updateSnapshots: 'none',
  snapshotPathTemplate: '{testDir}/../../docs/screenshots/baselines/{arg}{ext}',
  workers: 1,
  reporter: 'list',
  testMatch: ['**/*.spec.ts'],
  testIgnore: ['**/src/**', '**/node_modules/**'],
  use: {
    baseURL: 'http://127.0.0.1:3030',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 3030 --strictPort',
    url: 'http://127.0.0.1:3030',
    reuseExistingServer: false,
    cwd: '../',
    timeout: 60_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
