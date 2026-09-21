import { test, expect, type Page, devices } from '@playwright/test'
import * as path from 'path'

const SCREENSHOT_DIR = 'C:/Users/gustavo/.gemini/antigravity/brain/621d0a40-5750-4c41-9018-8de7648e843c/mobile_screenshots'

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
        steps: 8_423,
        rhr_bpm: 48,
        hrv_ms: 62.5,
        sleep_minutes: 445,
        vo2_max: 44.2,
        calories: 2150,
        respiratory_rate_rpm: 14.5,
        spo2_avg_pct: 98,
        training_load_daily: 120,
        training_load_rolling: 480,
        training_load_optimal_min: 400,
        training_load_optimal_max: 700,
        workout_count: 1,
        workout_duration_min: 45,
      }]),
    })
  })

  await page.route('**/api/labs', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{
        id: 1,
        collected_at: '2025-02-15',
        metric_key: 'fasting_glucose',
        metric_name: 'Glicemia em Jejum',
        value: 89,
        unit: 'mg/dL',
        ref_min: 70,
        ref_max: 99,
        optimal_target: 85,
        category: 'Metabolismo',
      }]),
    })
  })

  await page.route('**/api/phenoage/history', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{
        calculated_at: '2025-03-01',
        pheno_age: 35.2,
        kdm: { kdm_score: 0.82, biological_age: 36.1 },
      }]),
    })
  })

  await page.route('**/api/n-of-1', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{
        id: 1,
        name: 'Niacina 500mg',
        started_at: '2025-02-01',
        status: 'active',
      }]),
    })
  })

  await page.route('**/api/cgm/summary', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })

  await page.route('**/api/profile', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        name: 'Paciente Longevidade',
        email: 'synthetic@example.test',
        birthdate: '1986-07-28',
        chronological_age: 40,
        height_cm: 170,
        current_weight_kg: 72.5,
        target_weight_kg: 75,
        gender: 'Masculino',
        google_connected: false,
        source: 'synthetic-e2e',
      }),
    })
  })

  await page.route('**/api/kdm/latest', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ kdm_score: 0.82, biological_age: 36.1 }]),
    })
  })

  await page.route('**/api/supplements/logs/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })
  await page.route('**/api/supplements/audit-logs', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })
  await page.route('**/api/supplements', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })

  await page.route('**/api/ai/settings', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        active_provider: 'openrouter',
        selected_model: 'deepseek/deepseek-v4-pro',
        privacy_mode: 'minimal',
        has_openai_key: false,
        has_anthropic_key: false,
        has_openrouter_key: false,
      }),
    })
  })
  await page.route('**/api/ai/history', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })

  await page.route('**/api/physical-assessments', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })

  await page.route('**/api/pipeline-runs*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })

  await page.route('**/api/workouts/summary**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        total_workouts: 12,
        hevy_workouts: 8,
        zepp_workouts: 4,
        total_volume_kg: 14500,
        total_sets: 72,
        total_reps: 680,
        total_duration_min: 540,
        total_calories: 3200,
        avg_hr: 132,
      }),
    })
  })

  await page.route('**/api/workouts**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })
}

// Smartphone viewports to test: iPhone 14 (390x844), iPhone SE (375x667)
test.describe('Mobile Viewport Audit', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  })

  test('audit mobile viewport layout and capture diagnostics', async ({ page }) => {
    await mockApi(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    function isInsideScrollableContainer(element: Element): boolean {
      let current: Element | null = element.parentElement
      while (current && current !== document.body && current !== document.documentElement) {
        const style = window.getComputedStyle(current)
        const overflowX = style.overflowX
        if (overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'hidden') {
          return true
        }
        current = current.parentElement
      }
      return false
    }

    // 1. Overview Page
    const overflowInfoOverview = await page.evaluate(() => {
      const docWidth = window.innerWidth
      const scrollW = document.documentElement.scrollWidth
      const bodyScrollW = document.body.scrollWidth

      function hasScrollParent(el: Element): boolean {
        let cur = el.parentElement
        while (cur && cur !== document.body && cur !== document.documentElement) {
          const style = window.getComputedStyle(cur)
          if (['auto', 'scroll', 'hidden'].includes(style.overflowX)) return true
          cur = cur.parentElement
        }
        return false
      }

      const uncontainedOverflowElements = Array.from(document.querySelectorAll('*'))
        .filter((el) => {
          const r = el.getBoundingClientRect()
          return r.right > docWidth + 1 && !hasScrollParent(el)
        })
        .map((el) => ({
          tag: el.tagName,
          className: el.className ? String(el.className).slice(0, 80) : '',
          id: el.id,
          right: Math.round(el.getBoundingClientRect().right),
          docWidth,
        }))
      return { docWidth, scrollW, bodyScrollW, badElements: uncontainedOverflowElements }
    })

    console.log('OVERVIEW OVERFLOW INFO:', JSON.stringify(overflowInfoOverview, null, 2))
    expect(overflowInfoOverview.scrollW).toBeLessThanOrEqual(overflowInfoOverview.docWidth)
    expect(overflowInfoOverview.badElements).toEqual([])

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01_mobile_overview_top.png'),
      fullPage: false,
    })

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01_mobile_overview_full.png'),
      fullPage: true,
    })

    // Test Tabs
    const tabs = [
      { id: 'workouts', name: '02_mobile_workouts' },
      { id: 'labs', name: '03_mobile_labs' },
      { id: 'supplements', name: '04_mobile_supplements' },
      { id: 'sleep', name: '05_mobile_sleep' },
      { id: 'ai', name: '06_mobile_ai' },
      { id: 'n-of-1', name: '07_mobile_nof1' },
      { id: 'physical-assessments', name: '08_mobile_assessments' },
      { id: 'profile', name: '09_mobile_profile' },
    ]

    for (const t of tabs) {
      await page.goto(`/#${t.id}`)
      await page.waitForTimeout(500)
      const tabOverflow = await page.evaluate(() => {
        const docWidth = window.innerWidth
        const scrollW = document.documentElement.scrollWidth
        function hasScrollParent(el: Element): boolean {
          let cur = el.parentElement
          while (cur && cur !== document.body && cur !== document.documentElement) {
            const style = window.getComputedStyle(cur)
            if (['auto', 'scroll', 'hidden'].includes(style.overflowX)) return true
            cur = cur.parentElement
          }
          return false
        }
        const badElements = Array.from(document.querySelectorAll('*'))
          .filter((el) => el.getBoundingClientRect().right > docWidth + 1 && !hasScrollParent(el))
          .map((el) => ({
            tag: el.tagName,
            className: el.className ? String(el.className).slice(0, 80) : '',
            right: Math.round(el.getBoundingClientRect().right),
          }))
        return { scrollW, docWidth, badElements }
      })
      console.log(`TAB ${t.id} OVERFLOW:`, JSON.stringify(tabOverflow, null, 2))
      expect(tabOverflow.scrollW).toBeLessThanOrEqual(tabOverflow.docWidth)
      expect(tabOverflow.badElements).toEqual([])

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${t.name}.png`),
        fullPage: false,
      })
    }

    // Modal tests
    await page.goto('/#overview')
    await page.waitForTimeout(300)

    // Manual Entry Modal
    await page.getByRole('button', { name: /registrar/i }).click()
    await page.waitForTimeout(300)
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '10_mobile_modal_manual_entry.png'),
    })
    const manualModalScrollW = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(manualModalScrollW).toBeLessThanOrEqual(390)
    await page.getByLabel('Fechar modal').click()
    await page.waitForTimeout(200)

    // Doctor Briefing Modal
    await page.getByRole('button', { name: /doctor briefing/i }).click()
    await page.waitForTimeout(300)
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '11_mobile_modal_doctor_briefing.png'),
    })
    const doctorModalScrollW = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(doctorModalScrollW).toBeLessThanOrEqual(390)
    await page.getByLabel('Fechar').click()
    await page.waitForTimeout(200)

    // AI Settings Modal
    await page.locator('button[title*="Configurações"]').click()
    await page.waitForTimeout(300)
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '12_mobile_modal_ai_settings.png'),
    })
    const aiModalScrollW = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(aiModalScrollW).toBeLessThanOrEqual(390)
    await page.getByLabel('Fechar').click()
  })
})
