import { test, expect } from '@playwright/test'

for (const theme of ['dark', 'light']) for (const width of [320, 1440]) {
  test(`revisão de laudo em ${width}px no tema ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 320 ? 700 : 900 })
    await page.addInitScript(value => localStorage.setItem('longevity-hub-theme', value), theme)
    let confirmations = 0
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname
      if (path === '/api/owner/session') return route.fulfill({ json: { authenticated: true } })
      if (path === '/api/profile') return route.fulfill({ json: { onboarding_completed: true } })
      if (path === '/api/labs/validate-preview') return route.fulfill({ json: { records: [{ normalized_value: 90, normalized_unit: 'mg/dL', duplicate: true, error: null }] } })
      if (path === '/api/labs/confirm') { confirmations += 1; return route.fulfill({ json: { status: 'ok' } }) }
      return route.fulfill({ json: [] })
    })
    await page.goto('/')
    await page.getByRole('navigation', { name: 'Navegação Principal' }).getByRole('button', { name: 'Saúde', exact: true }).click()
    await page.getByRole('button', { name: 'Importar laudo' }).click()
    const dialog = page.getByRole('dialog', { name: 'Revisar exames' })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Validar prévia' }).click()
    await expect(dialog.getByRole('alert')).toContainText('Preencha')
    await dialog.getByLabel('Data da coleta 1').fill('2025-01-02')
    await dialog.getByLabel('Chave do marcador 1').fill('glucose_mgdl')
    await dialog.getByLabel('Nome no laudo 1').fill('Glicose')
    await dialog.getByLabel('Valor original 1').fill('90')
    await dialog.getByLabel('Unidade original 1').fill('mg/dL')
    await dialog.getByRole('button', { name: 'Validar prévia' }).click()
    await expect(dialog.getByText(/possível duplicata/)).toBeVisible()
    await dialog.getByLabel('Conferi os resultados com o laudo.').check()
    await expect(dialog.getByRole('button', { name: 'Confirmar e salvar' })).toBeDisabled()
    expect(confirmations).toBe(0)
    await dialog.getByLabel('Revisei as possíveis duplicatas e desejo incluí-las.').check()
    const submit = dialog.getByRole('button', { name: 'Confirmar e salvar' })
    await submit.focus()
    await expect(submit).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(dialog).toBeHidden()
    expect(confirmations).toBe(1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}
