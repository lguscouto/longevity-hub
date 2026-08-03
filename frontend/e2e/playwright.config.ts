import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  testMatch: ['**/smoke.spec.ts'],
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
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 3030',
    url: 'http://127.0.0.1:3030',
    reuseExistingServer: false,
    cwd: '../',
    timeout: 60_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})