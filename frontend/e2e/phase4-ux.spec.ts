import { test, expect } from '@playwright/test'

for (const theme of ['dark', 'light'] as const) {
  for (const width of [320, 1440]) test(`navegação em ${width}px e estados em português no tema ${theme}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: width === 320 ? 700 : 900 })
    await page.addInitScript(value => localStorage.setItem('longevity-hub-theme', value), theme)
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname
      if (path === '/api/daily-guidance') return route.fulfill({ json: { state: 'insufficient_data', label: 'unavailable', confidence: 'unavailable', factors: [], limitations: [] } })
      if (path === '/api/quality/daily') return route.fulfill({ json: { confidence: 'unavailable' } })
      if (path === '/api/profile') return route.fulfill({ json: { onboarding_completed: true } })
      if (path === '/api/owner/session') return route.fulfill({ json: { authenticated: true } })
      return route.fulfill({ json: [] })
    })
    await page.goto('/')
    const logout = page.getByRole('button', { name: 'Sair da conta do proprietário' })
    const themeControl = page.getByRole('button', { name: /Alternar para tema/ })
    const logoutBox = await logout.boundingBox()
    const themeBox = await themeControl.boundingBox()
    expect(logoutBox).not.toBeNull()
    expect(themeBox).not.toBeNull()
    expect(logoutBox!.x).toBeGreaterThan(themeBox!.x)
    expect(Math.abs(logoutBox!.y - themeBox!.y)).toBeLessThan(10)
    expect(logoutBox!.height).toBeGreaterThanOrEqual(44)
    expect(logoutBox!.x + logoutBox!.width).toBeLessThanOrEqual(width)
    const navigation = page.getByRole('navigation', { name: 'Navegação Principal' })
    await expect(navigation).toBeVisible()
    for (const label of ['Hoje', 'Saúde', 'Treinos', 'Intervenções', 'IA e Copiloto', 'Perfil']) {
      const button = navigation.getByRole('button', { name: label, exact: true })
      await button.scrollIntoViewIfNeeded()
      await expect(button).toBeVisible()
      expect(await button.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
      expect((await button.boundingBox())?.height).toBeGreaterThanOrEqual(44)
    }
    await expect(page.getByRole('heading', { name: 'Dados insuficientes' })).toBeVisible()
    await expect(page.getByText('Dados insuficientes', { exact: true }).first()).not.toContainText('%')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath('viewport.png') })
    const health = navigation.getByRole('button', { name: 'Saúde', exact: true })
    await health.focus()
    await expect(health).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(health).toHaveAttribute('aria-current', 'page')
  })
}
