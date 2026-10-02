import { test, expect, type Page } from '@playwright/test'

const VIEWPORTS = [
  { name: 'iPhone SE (375x667)', width: 375, height: 667 },
  { name: 'iPhone 14 (390x844)', width: 390, height: 844 },
  { name: 'iPad Portrait (768x1024)', width: 768, height: 1024 },
  { name: 'Desktop (1280x800)', width: 1280, height: 800 },
]

const mockApi = async (page: Page) => {
  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    })
  })

  await page.route('**/api/metrics**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{
        date_ref: new Date().toISOString().slice(0, 10),
        steps: 9_200,
        rhr_bpm: 49,
        hrv_ms: 65.0,
        sleep_minutes: 460,
        vo2_max: 45.0,
        calories: 2200,
        respiratory_rate_rpm: 14.0,
        spo2_avg_pct: 99,
        training_load_daily: 110,
        training_load_rolling: 460,
        training_load_optimal_min: 400,
        training_load_optimal_max: 700,
        workout_count: 1,
        workout_duration_min: 60,
      }]),
    })
  })

  await page.route('**/api/labs', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 1,
          collected_at: '2025-02-15',
          metric_key: 'fasting_glucose',
          metric_name: 'Glicemia em Jejum',
          value: 88,
          unit: 'mg/dL',
          ref_min: 70,
          ref_max: 99,
          optimal_target: 85,
          category: 'Metabolismo',
        },
        {
          id: 2,
          collected_at: '2025-02-15',
          metric_key: 'apob',
          metric_name: 'Apolipoproteína B',
          value: 70,
          unit: 'mg/dL',
          ref_min: 40,
          ref_max: 90,
          optimal_target: 65,
          category: 'Cardiovascular',
        },
      ]),
    })
  })

  await page.route('**/api/workouts', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 101,
          title: 'Treino A - Superiores & Força',
          start_time: '2025-02-20T08:00:00Z',
          end_time: '2025-02-20T09:15:00Z',
          duration_minutes: 75,
          source: 'hevy',
          exercises: [{ title: 'Supino Reto com Barra', sets: 4, volume_kg: 3200 }],
        },
      ]),
    })
  })

  await page.route('**/api/supplements/active', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 1,
          name: 'Creatina Monohidratada',
          dosage: '5g',
          routine_time: 'morning',
          timing: 'Café da manhã',
          purpose: 'Cognição e força celular',
          category: 'Longevidade & Mitocôndria',
          active: true,
          evidence_grade: 'A',
        },
      ]),
    })
  })

  await page.route('**/api/sleep/records**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          date_ref: '2025-02-20',
          sleep_duration_hours: 7.8,
          efficiency_pct: 92,
          deep_sleep_pct: 22,
          rem_sleep_pct: 25,
          hrv_overnight_ms: 64,
          rhr_overnight_bpm: 48,
        },
      ]),
    })
  })

  await page.route('**/api/reports/doctor-briefing', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        markdown: '# Relatório Clínico\n\n- Glicemia: 88 mg/dL\n- ApoB: 70 mg/dL',
      }),
    })
  })
}

test.describe('UX-P2-09: Auditoria Visual QA Transversal (Dark & Light, Multi-Viewport)', () => {
  for (const vp of VIEWPORTS) {
    test(`Visual QA em ${vp.name} com validação de Dark e Light mode`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await mockApi(page)
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // 1. Validar rodapé com aviso clínico obrigatório
      const footerNotice = page.locator('footer')
      await expect(footerNotice).toBeVisible()
      await expect(footerNotice).toContainText('Aviso Clínico: Este aplicativo organiza e analisa dados de saúde')

      // 2. Validar ausência de overflow horizontal inicial
      const hasHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
      expect(hasHorizontalScroll, `Overflow horizontal detectado em ${vp.name}`).toBe(false)

      // 3. Testar alternância de tema (Dark / Light)
      const themeToggle = page.locator('button[aria-label*="tema" i], button[aria-label*="modo" i], button[aria-label*="escuro" i], button[aria-label*="claro" i]').first()
      if (await themeToggle.isVisible()) {
        const isInitiallyDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
        await themeToggle.click()
        const isNowDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
        expect(isNowDark).toBe(!isInitiallyDark)

        // Alternar de volta
        await themeToggle.click()
      }

      // 4. Navegação pelas abas essenciais
      const tabsToTest = ['workouts', 'labs', 'supplements', 'sleep', 'ai']
      for (const tabKey of tabsToTest) {
        const tabButton = page.locator(`button[data-tab="${tabKey}"], button[aria-controls="${tabKey}"], button:has-text("${tabKey}")`).first()
        if (await tabButton.isVisible()) {
          await tabButton.click()
          await page.waitForTimeout(100)

          const tabOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
          expect(tabOverflow, `Overflow horizontal detectado na aba ${tabKey} em ${vp.name}`).toBe(false)
        }
      }

      // 5. Testar abertura do Doctor Briefing Modal e conferir aviso clínico
      const doctorButton = page.locator('button:has-text("Briefing"), button[aria-label*="médico" i], button[aria-label*="briefing" i]').first()
      if (await doctorButton.isVisible()) {
        await doctorButton.click()
        const modal = page.locator('[role="dialog"]')
        await expect(modal).toBeVisible()
        await expect(modal).toContainText('Aviso Clínico:')

        // Fechar modal via Escape
        await page.keyboard.press('Escape')
        await expect(modal).not.toBeVisible()
      }
    })
  }
})
