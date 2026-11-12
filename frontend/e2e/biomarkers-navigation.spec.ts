import { test, expect } from '@playwright/test'

for (const theme of ['dark', 'light']) for (const width of [320, 1440]) {
  test(`exames e biomarcadores separados em ${width}px no tema ${theme}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: width === 320 ? 700 : 900 })
    await page.addInitScript(value => localStorage.setItem('longevity-hub-theme', value), theme)
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname
      if (path === '/api/owner/session') return route.fulfill({ json: { authenticated: true } })
      if (path === '/api/profile') return route.fulfill({ json: { onboarding_completed: true } })
      if (path === '/api/biomarkers/derived') return route.fulfill({ json: { metrics_by_category: {}, available_dates: [], direct_biomarkers_series: {} } })
      return route.fulfill({ json: [] })
    })
    await page.goto('/#labs')
    const navigation = page.getByRole('navigation', { name: 'Exames, biomarcadores e passos' })
    await expect(page.getByRole('heading', { name: 'Exames laboratoriais e referências' })).toBeVisible()
    await expect(page.getByText('Painel de Biomarcadores Derivados & Modelos Clínicos')).toHaveCount(0)
    const biomarkers = navigation.getByRole('button', { name: 'Biomarcadores' })
    await biomarkers.focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#biomarkers$/)
    await expect(biomarkers).toHaveAttribute('aria-current', 'page')
    await expect(page.getByText('Painel de Biomarcadores Derivados & Modelos Clínicos')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Exames laboratoriais e referências' })).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath('biomarcadores.png') })
    await page.reload()
    await expect(page.getByText('Painel de Biomarcadores Derivados & Modelos Clínicos')).toBeVisible()
    await navigation.getByRole('button', { name: 'Exames', exact: true }).click()
    await expect(page).toHaveURL(/#labs$/)
    await expect(page.getByRole('button', { name: 'Importar laudo' })).toBeVisible()
  })
}
