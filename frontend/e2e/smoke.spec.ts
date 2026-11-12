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
    const now = new Date()
    const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const utcDate = now.toISOString().slice(0, 10)
    const dates = Array.from(new Set([localDate, utcDate]))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(dates.map((d) => ({
        date_ref: d,
        steps: 8_423,
        rhr_bpm: 48,
        hrv_ms: 62.5,
        sleep_minutes: 445,
        vo2_max: 44.2,
        systolic_bp: 118,
        diastolic_bp: 76,
      }))),
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
    const syncErrorResponse = {
      status: 502,
      contentType: 'application/json',
      body: JSON.stringify({
        detail: 'A coleta Zepp não foi concluída; snapshots anteriores não foram importados.',
      }),
    }
    await page.route('**/api/metrics/sync/zepp*', async (route) => {
      await route.fulfill(syncErrorResponse)
    })
    await page.route('**/api/sync/all*', async (route) => {
      await route.fulfill(syncErrorResponse)
    })

    await page.goto('/')
    runtimeEvidence.get(page)?.allowedConsoleErrorFragments.push(
      'the server responded with a status of 502'
    )
    await page.getByRole('button', { name: 'Sincronizar' }).first().click()

    await expect(page.getByRole('heading', { name: /Não foi possível concluir a sincronização|Sincronização com erro/i })).toBeVisible()
    await expect(
      page.getByText('A coleta Zepp não foi concluída; snapshots anteriores não foram importados.').first()
    ).toBeVisible()
    await expect(page.getByText('Fechar', { exact: true })).toBeVisible()
  })

  test('navegação por abas atualiza o deep link e preserva a aba após reload', async ({ page }) => {
    await page.goto('/')

    // 1. Navegar para Saúde (ativa Exames & PhenoAge por padrão)
    const saudeBtn = page.getByRole('button', { name: /^saúde$/i })
    await expect(saudeBtn).toBeVisible()
    await saudeBtn.click()
    await expect(page).toHaveURL(/#labs$/)
    await expect(page.locator('main')).not.toBeEmpty()

    // 2. Navegar para Intervenções (ativa Suplementos por padrão)
    const intervencoesBtn = page.getByRole('button', { name: /^intervenções$/i })
    await expect(intervencoesBtn).toBeVisible()
    await intervencoesBtn.click()
    await expect(page).toHaveURL(/#supplements$/)
    await expect(page.locator('main')).not.toBeEmpty()

    // 3. Navegar para IA e Copiloto
    const aiBtn = page.getByRole('button', { name: /ia e copiloto/i })
    await expect(aiBtn).toBeVisible()
    await aiBtn.click()
    await expect(page).toHaveURL(/#ai$/)
    await expect(page.locator('main')).not.toBeEmpty()

    // 4. Navegar para sub-aba Experimentos pessoais dentro de Intervenções
    await intervencoesBtn.click()
    const nof1SubTab = page.getByRole('button', { name: /experimentos pessoais/i })
    await expect(nof1SubTab).toBeVisible()
    await nof1SubTab.click()
    await expect(page).toHaveURL(/#n-of-1$/)
    await expect(page.locator('main')).not.toBeEmpty()

    // 5. Navegar para sub-aba Avaliações Físicas dentro de Saúde
    await saudeBtn.click()
    const physicalSubTab = page.getByRole('button', { name: /avaliações físicas/i })
    await expect(physicalSubTab).toBeVisible()
    await physicalSubTab.click()
    await expect(page).toHaveURL(/#physical-assessments$/)
    await expect(page.locator('main')).not.toBeEmpty()

    // 6. Navegar para Perfil
    const profileBtn = page.getByRole('button', { name: /^perfil$/i })
    await expect(profileBtn).toBeVisible()
    await profileBtn.click()
    await expect(page).toHaveURL(/#profile$/)
    await expect(page.locator('main')).not.toBeEmpty()

    await page.reload()
    await expect(page).toHaveURL(/#profile$/)
    await expect(page.getByRole('heading', { name: /Paciente Longevidade/i })).toBeVisible({ timeout: 15_000 })
  })

  test('modelos mantêm configurações independentes e o editor salva ou descarta rascunhos', async ({ page }) => {
    await page.goto('/')
    const model = page.getByLabel('Modelo', { exact: true })
    await expect(model).toHaveValue('classic')

    await model.selectOption('day')
    await expect(page.getByTestId('dashboard-day')).toBeVisible()
    await page.getByRole('button', { name: 'Personalizar' }).click()
    let editor = page.getByRole('dialog', { name: 'Personalizar painel' })
    await editor.getByRole('button', { name: 'Remover Rotina' }).click()
    await editor.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.locator('[data-dashboard-widget="routine"]')).toBeVisible()

    await page.getByRole('button', { name: 'Personalizar' }).click()
    editor = page.getByRole('dialog', { name: 'Personalizar painel' })
    await editor.getByRole('button', { name: 'Remover Rotina' }).click()
    await editor.getByRole('button', { name: 'Adicionar Sono' }).click()
    await editor.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(page.locator('[data-dashboard-widget="routine"]')).toHaveCount(0)
    await expect(page.locator('[data-dashboard-widget="sleep"]')).toBeVisible()

    await model.selectOption('trends')
    await expect(page.getByTestId('dashboard-trends')).toBeVisible()
    await page.getByRole('button', { name: 'Personalizar' }).click()
    editor = page.getByRole('dialog', { name: 'Personalizar painel' })
    await editor.getByLabel('Métrica do gráfico principal').selectOption('sleep_minutes')
    await editor.getByLabel('Área de Gráfico principal').selectOption('side')
    await editor.getByRole('button', { name: 'Salvar alterações' }).click()

    const beforeRestore = await page.evaluate(() => JSON.parse(localStorage.getItem('longevidade_dashboard_preferences_v1') || '{}'))
    expect(beforeRestore.active).toBe('trends')
    expect(beforeRestore.layouts.day.widgets.some((widget: { id: string }) => widget.id === 'routine')).toBe(false)
    expect(beforeRestore.layouts.day.widgets.some((widget: { id: string }) => widget.id === 'sleep')).toBe(true)
    expect(beforeRestore.layouts.trends.trendMetric).toBe('sleep_minutes')
    expect(beforeRestore.layouts.trends.widgets.find((widget: { id: string }) => widget.id === 'chart').area).toBe('side')

    await model.selectOption('day')
    await page.getByRole('button', { name: 'Personalizar' }).click()
    editor = page.getByRole('dialog', { name: 'Personalizar painel' })
    await editor.getByRole('button', { name: 'Restaurar modelo' }).click()
    await editor.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.locator('[data-dashboard-widget="routine"]')).toHaveCount(0)
    await page.getByRole('button', { name: 'Personalizar' }).click()
    editor = page.getByRole('dialog', { name: 'Personalizar painel' })
    await editor.getByRole('button', { name: 'Restaurar modelo' }).click()
    await editor.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(page.locator('[data-dashboard-widget="routine"]')).toBeVisible()
    await expect(page.locator('[data-dashboard-widget="sleep"]')).toHaveCount(0)

    await page.getByRole('button', { name: 'Personalizar' }).click()
    editor = page.getByRole('dialog', { name: 'Personalizar painel' })
    const moveTrainingUp = editor.getByRole('button', { name: 'Mover Carga de treino para cima' })
    await moveTrainingUp.focus()
    await page.keyboard.press('Enter')
    await editor.getByRole('button', { name: 'Salvar alterações' }).click()

    await model.selectOption('modular')
    await expect(page.getByTestId('dashboard-modular')).toBeVisible()
    await page.reload()
    await expect(page.getByLabel('Modelo', { exact: true })).toHaveValue('modular')
    await expect(page.getByTestId('dashboard-modular')).toBeVisible()
    await page.getByRole('button', { name: 'Personalizar' }).click()
    editor = page.getByRole('dialog', { name: 'Personalizar painel' })
    await editor.getByLabel('Largura de Sono').selectOption('full')
    await editor.getByRole('button', { name: 'Salvar alterações' }).click()
    await page.reload()
    await expect(page.getByTestId('dashboard-modular')).toBeVisible()
    const afterReload = await page.evaluate(() => JSON.parse(localStorage.getItem('longevidade_dashboard_preferences_v1') || '{}'))
    expect(afterReload.layouts.trends.trendMetric).toBe('sleep_minutes')
    expect(afterReload.layouts.day.widgets.some((widget: { id: string }) => widget.id === 'routine')).toBe(true)
    const daySide = afterReload.layouts.day.widgets.filter((widget: { area: string }) => widget.area === 'side').map((widget: { id: string }) => widget.id)
    expect(daySide).toEqual(['checkin', 'training', 'routine'])
    expect(afterReload.layouts.modular.widgets.find((widget: { id: string }) => widget.id === 'sleep').width).toBe('full')

    await page.getByRole('button', { name: 'Personalizar' }).click()
    editor = page.getByRole('dialog', { name: 'Personalizar painel' })
    for (const widget of ['Sono', 'Passos', 'Glicemia', 'Check-in']) {
      await editor.getByRole('button', { name: `Remover ${widget}` }).click()
    }
    await editor.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(page.getByText('Seu painel está vazio.')).toBeVisible()
    await page.getByRole('button', { name: 'Abrir personalização' }).click()
    editor = page.getByRole('dialog', { name: 'Personalizar painel' })
    await editor.getByRole('button', { name: 'Restaurar modelo' }).click()
    await editor.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(page.locator('[data-dashboard-widget="checkin"]')).toBeVisible()
  })

  test('tendências se adaptam a 320 px e aos temas claro e escuro', async ({ page }) => {
    await page.addInitScript(() => {
      if (!localStorage.getItem('longevity-hub-theme')) localStorage.setItem('longevity-hub-theme', 'light')
    })
    await page.setViewportSize({ width: 320, height: 800 })
    await page.goto('/')
    await page.getByLabel('Modelo', { exact: true }).selectOption('trends')
    const dashboard = page.getByTestId('dashboard-trends')
    await expect(dashboard).toBeVisible()
    await expect(page.getByRole('region', { name: 'VFC no período' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Sono no período' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Passos no período' })).toBeVisible()
    await expect(dashboard.getByRole('heading', { name: 'Dias com dados' })).toBeVisible()
    await expect.poll(() => dashboard.evaluate(element => element.getBoundingClientRect().right)).toBeLessThanOrEqual(320)
    await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(false)

    await page.evaluate(() => localStorage.setItem('longevity-hub-theme', 'dark'))
    await page.reload()
    await expect(page.getByTestId('dashboard-trends')).toBeVisible()
    await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true)
    await page.getByRole('button', { name: 'Personalizar' }).click()
    const editor = page.getByRole('dialog', { name: 'Personalizar painel' })
    await expect(editor).toBeVisible()
    await expect.poll(() => editor.evaluate(element => element.getBoundingClientRect().right)).toBeLessThanOrEqual(320)
  })

  test('separa falha de carregamento de ausência de medições e oferece nova tentativa', async ({ page }) => {
    let rangeRequests = 0
    runtimeEvidence.get(page)?.allowedConsoleErrorFragments.push('Service Unavailable')
    await page.route(url => {
      const parsed = new URL(url)
      return parsed.pathname === '/api/metrics' && parsed.searchParams.has('start_date')
    }, async route => {
      rangeRequests += 1
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ detail: 'Falha sintética do histórico.' }) })
    })
    await page.goto('/')
    await page.getByLabel('Modelo', { exact: true }).selectOption('trends')
    await expect(page.getByRole('alert')).toContainText('Falha sintética do histórico.')
    await expect(page.getByText('Histórico indisponível.').first()).toBeVisible()
    await expect(page.getByText('Sem medições no período selecionado.')).toHaveCount(0)
    const firstCount = rangeRequests
    await page.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect.poll(() => rangeRequests).toBeGreaterThan(firstCount)
  })

  test('permite arrastar um widget entre áreas no desktop', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Arrastar widgets é validado no projeto desktop; toque usa os botões de mover.')
    await page.goto('/')
    await page.getByLabel('Modelo', { exact: true }).selectOption('trends')
    await page.getByRole('button', { name: 'Personalizar' }).click()
    const editor = page.getByRole('dialog', { name: 'Personalizar painel' })
    await editor.getByTestId('dashboard-drag-handle-chart').dragTo(editor.getByRole('region', { name: 'Lateral' }))
    await editor.getByRole('button', { name: 'Salvar alterações' }).click()
    const preferences = await page.evaluate(() => JSON.parse(localStorage.getItem('longevidade_dashboard_preferences_v1') || '{}'))
    expect(preferences.layouts.trends.widgets.find((widget: { id: string }) => widget.id === 'chart').area).toBe('side')
  })
})
