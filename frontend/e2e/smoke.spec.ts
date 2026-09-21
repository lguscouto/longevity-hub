import { test, expect, type Page } from '@playwright/test'

type RuntimeEvidence = {
  pageErrors: string[]
  consoleErrors: string[]
  failedRequests: string[]
  externalRequests: string[]
  allowedConsoleErrorFragments: string[]
}

const runtimeEvidence = new WeakMap<Page, RuntimeEvidence>()

/**
 * Mock de dados sintéticos para os endpoints da API.
 * O Playwright intercepta as chamadas fetch antes de chegarem ao
 * servidor real, garantindo que o E2E rode sem depender do backend
 * ou do banco operacional.
 */
const mockApi = async ({ page }) => {
  // Fallback registrado primeiro: os mocks específicos abaixo têm prioridade.
  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    })
  })
  // ── Metrics ──────────────────────────────────────────────
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
        systolic_bp: 118,
        diastolic_bp: 76,
      }]),
    })
  })

  // ── Labs ─────────────────────────────────────────────────
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

  // ── PhenoAge History ─────────────────────────────────────
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

  // ── N-of-1 ──────────────────────────────────────────────
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

  // ── CGM Summary ─────────────────────────────────────────
  await page.route('**/api/cgm/summary', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })

  // ── Profile ─────────────────────────────────────────────
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

  // ── KDM latest ──────────────────────────────────────────
  await page.route('**/api/kdm/latest', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ kdm_score: 0.82, biological_age: 36.1 }]),
    })
  })

  // ── Supplements ──────────────────────────────────────────
  await page.route('**/api/supplements/logs/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })
  await page.route('**/api/supplements/audit-logs', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })
  await page.route('**/api/supplements', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })

  // ── AI settings/history ─────────────────────────────────
  await page.route('**/api/ai/settings', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        active_provider: 'local',
        selected_model: 'synthetic-e2e',
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

  // ── Physical assessments ─────────────────────────────────
  await page.route('**/api/physical-assessments', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })

  // ── Pipeline runs ───────────────────────────────────────
  await page.route('**/api/pipeline-runs*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })

}

test.describe('Smoke – Longevidade Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    const evidence: RuntimeEvidence = {
      pageErrors: [],
      consoleErrors: [],
      failedRequests: [],
      externalRequests: [],
      allowedConsoleErrorFragments: [],
    }
    runtimeEvidence.set(page, evidence)

    page.on('pageerror', (error) => evidence.pageErrors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') evidence.consoleErrors.push(message.text())
    })
    page.on('requestfailed', (request) => {
      evidence.failedRequests.push(`${request.method()} ${request.url()}`)
    })
    page.on('request', (request) => {
      const url = request.url()
      if (/^https?:\/\//.test(url) && !url.startsWith('http://127.0.0.1:3030/')) {
        evidence.externalRequests.push(url)
      }
    })

    await mockApi({ page })
  })

  test.afterEach(async ({ page }) => {
    const evidence = runtimeEvidence.get(page)
    expect(evidence?.pageErrors ?? []).toEqual([])
    const unexpectedConsoleErrors = (evidence?.consoleErrors ?? []).filter(
      (message) => !(evidence?.allowedConsoleErrorFragments ?? []).some((fragment) => message.includes(fragment))
    )
    expect(unexpectedConsoleErrors).toEqual([])
    expect(evidence?.failedRequests ?? []).toEqual([])
    expect(evidence?.externalRequests ?? []).toEqual([])
  })

  test('página carrega com título e estrutura básica', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveTitle(/Longevidade/)
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 10_000 })
    await expect(page.getByRole('heading', { name: /visão geral/i })).toBeVisible({ timeout: 15_000 })
  })

  test('métricas renderizam com os valores sintéticos mockados', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText('8.423')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('48 bpm')).toBeVisible()
    await expect(page.getByText('7h 25m')).toBeVisible()
    await expect(page.getByText('44.2')).toBeVisible()
  })

  test('Sync Zepp mostra erro da coleta sem exibir sucesso falso', async ({ page }) => {
    await page.route('**/api/metrics/sync/zepp', async (route) => {
      await route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: 'A coleta Zepp não foi concluída; snapshots anteriores não foram importados.',
        }),
      })
    })

    await page.goto('/')
    runtimeEvidence.get(page)?.allowedConsoleErrorFragments.push(
      'the server responded with a status of 502'
    )
    await page.getByRole('button', { name: 'Sync Zepp' }).click()

    await expect(page.getByRole('heading', { name: 'Sincronização com erro' })).toBeVisible()
    await expect(
      page.getByText('A coleta Zepp não foi concluída; snapshots anteriores não foram importados.')
    ).toBeVisible()
    await expect(page.getByText('Fechar', { exact: true })).toBeVisible()
  })

  test('navegação por abas atualiza o deep link e preserva a aba após reload', async ({ page }) => {
    await page.goto('/')

    const tabs = [
      { label: /Exames & PhenoAge/i, hash: '#labs' },
      { label: /Suplementos & Hormônios/i, hash: '#supplements' },
      { label: /IA & Copiloto/i, hash: '#ai' },
      { label: /N-of-1 Tests/i, hash: '#n-of-1' },
      { label: /Avaliações Físicas/i, hash: '#physical-assessments' },
      { label: /Perfil/i, hash: '#profile' },
    ]

    for (const tab of tabs) {
      const button = page.getByRole('button', { name: tab.label })
      await expect(button).toHaveCount(1)
      await expect(button).toBeVisible()
      await button.click()
      await expect(page).toHaveURL(new RegExp(`${tab.hash.replace('#', '#')}$`))
      await expect(page.locator('main')).not.toBeEmpty()
    }

    await page.reload()
    await expect(page).toHaveURL(/#profile$/)
    await expect(page.getByRole('heading', { name: /Paciente Longevidade/i })).toBeVisible({ timeout: 15_000 })
  })
})