import { test, expect, type Page } from '@playwright/test';

const mockApi = async (page: Page) => {
  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });

  await page.route('**/api/reports/doctor-briefing', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        markdown: '# Relatório Clínico (Doctor Briefing)\n\nPaciente em acompanhamento de biomarcadores e longevidade.',
      }),
    });
  });

  await page.route('**/api/metrics**', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok', id: 999 }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          date_ref: new Date().toISOString().slice(0, 10),
          steps: 8423,
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
          workout_count: 2,
          workout_duration_min: 77,
        },
      ]),
    });
  });

  await page.route('**/api/labs', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 1,
          collected_at: '2025-02-15',
          metric_key: 'fasting_glucose',
          metric_name: 'Glicemia de Jejum',
          value: 89,
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
          value: 72,
          unit: 'mg/dL',
          ref_min: 40,
          ref_max: 90,
          optimal_target: 65,
          category: 'Cardiovascular',
        },
      ]),
    });
  });

  await page.route('**/api/phenoage/history', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          calculated_at: '2025-03-01',
          pheno_age: 35.2,
          kdm: { kdm_score: 0.82, biological_age: 36.1 },
        },
      ]),
    });
  });

  await page.route('**/api/n-of-1', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 1,
          name: 'Niacina 500mg',
          started_at: '2025-02-01',
          status: 'active',
        },
      ]),
    });
  });

  await page.route('**/api/cgm/summary', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

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
    });
  });

  await page.route('**/api/supplements', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 1,
          name: 'Creatina Monohidratada',
          dosage: '5g',
          routine_time: 'Manhã',
          category: 'Performance',
          active: true,
        },
        {
          id: 2,
          name: 'Magnésio Treonato',
          dosage: '400mg',
          routine_time: 'Noite',
          category: 'Sono',
          active: true,
        },
      ]),
    });
  });

  await page.route('**/api/supplements/logs/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/supplements/audit-logs', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/ai/settings', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        active_provider: 'openrouter',
        selected_model: 'deepseek/deepseek-v4-flash-0731',
        privacy_mode: 'minimal',
        has_openai_key: false,
        has_anthropic_key: false,
        has_openrouter_key: true,
      }),
    });
  });

  await page.route('**/api/physical-assessments', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'ass-new',
          assessment_date: '2026-10-02',
          title: 'Teste Mobile E2E',
          weight_kg: 75.0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          photos: [],
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'ass-1',
          assessment_date: '2026-07-28',
          title: 'Avaliação Inicial',
          weight_kg: 78.5,
          body_fat_percentage: 16.5,
          waist_cm: 82.0,
          created_at: '2026-07-28T10:00:00Z',
          updated_at: '2026-07-28T10:00:00Z',
          photos: [],
        },
      ]),
    });
  });

  await page.route('**/api/physical-assessments/timeline', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        target_weight_kg: null,
        points: [],
        summary: {},
      }),
    });
  });
};

const VIEWPORTS = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 14', width: 390, height: 844 },
];

for (const vp of VIEWPORTS) {
  test.describe(`UX_UI_23: Mobile Task Flows Hardening — ${vp.name} (${vp.width}x${vp.height})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await mockApi(page);
    });

    test('1. Registrar Métrica Manual via Modal', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      // Click metric registration button in header
      const openModalBtn = page.getByRole('button', { name: 'Registrar Métrica' });
      await expect(openModalBtn).toBeVisible();
      await openModalBtn.click();

      // Modal should be visible
      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();
      await expect(page.getByText('Registrar Métricas Manuais')).toBeVisible();

      // Close modal
      const closeBtn = page.getByLabel('Fechar modal');
      await closeBtn.click();
      await expect(modal).not.toBeVisible();
    });

    test('2. Abrir Briefing Médico via Modal', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const briefingBtn = page.getByRole('button', { name: 'Doctor Briefing' });
      await expect(briefingBtn).toBeVisible();
      await briefingBtn.click();

      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();
      await expect(page.getByRole('heading', { name: /Relatório Clínico/i })).toBeVisible();

      // Close briefing
      const closeBtn = page.getByRole('button', { name: 'Fechar', exact: true }).first();
      await closeBtn.click();
      await expect(modal).not.toBeVisible();
    });

    test('3. Marcar Dose / Suplementos View', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      // Navigate to Intervenções tab (opens Suplementos by default)
      const interventionsTab = page.getByRole('button', { name: 'Intervenções' });
      await interventionsTab.click();

      await expect(page.getByText('Creatina Monohidratada')).toBeVisible();
      await expect(page.getByText('Magnésio Treonato')).toBeVisible();
    });

    test('4. Navegar Subabas de Perfil', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      // Navigate to Perfil
      const perfilTab = page.getByRole('button', { name: 'Perfil' });
      await perfilTab.click();

      await expect(page.getByText('Paciente Longevidade')).toBeVisible();

      // Click Integrações sub-tab in main content
      const integracoesBtn = page.getByRole('main').getByRole('button', { name: 'Integrações' });
      await integracoesBtn.click();
      await expect(page.getByText(/Google Health/i).first()).toBeVisible();

      // Click Diagnóstico & Sistema sub-tab in main content
      const diagBtn = page.getByRole('main').getByRole('button', { name: 'Diagnóstico & Sistema' });
      await diagBtn.click();
      await expect(page.getByText('Base de Dados SQLite Local')).toBeVisible();
    });

    test('5. Copiloto de IA: Navegar Modos e Interagir', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      // Navigate to IA & Copiloto tab
      const copilotTab = page.getByRole('button', { name: 'IA & Copiloto' });
      await copilotTab.click();

      // Verify task buttons: Analisar, Conversar, Histórico
      await expect(page.getByRole('button', { name: /Analisar/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Conversar/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Histórico/i })).toBeVisible();

      // Click Conversar mode
      await page.getByRole('button', { name: /Conversar/i }).click();
      await expect(page.getByPlaceholder(/Faça uma pergunta/i)).toBeVisible();

      // Click Histórico mode
      await page.getByRole('button', { name: /Histórico/i }).click();
      await expect(page.getByText('Histórico de Relatórios de Longevidade')).toBeVisible();
    });

    test('6. Avaliação Física: Stepper Wizard e Navegação', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      // Navigate to Saúde tab
      const healthTab = page.getByRole('button', { name: 'Saúde' });
      await healthTab.click();

      // Click Avaliações Físicas sub-tab
      const physicalTab = page.getByRole('button', { name: 'Avaliações Físicas' });
      await physicalTab.click();

      await expect(page.getByText('Avaliações Físicas & Fotos Corporais')).toBeVisible();

      // Click Nova Avaliação
      const createBtn = page.getByRole('button', { name: /Nova Avaliação/i });
      await createBtn.click();

      // Step 1: Dados Principais
      await expect(page.getByText('Dados Principais da Avaliação')).toBeVisible();

      // Advance to Step 2
      await page.getByRole('button', { name: /Próxima Etapa/i }).click();
      await expect(page.getByText('Medidas Antropométricas & Circunferências')).toBeVisible();

      // Advance to Step 3
      await page.getByRole('button', { name: /Próxima Etapa/i }).click();
      await expect(page.getByText('Composição Corporal & Percentual de Gordura')).toBeVisible();

      // Step back to Step 2
      await page.getByRole('button', { name: /Etapa Anterior/i }).click();
      await expect(page.getByText('Medidas Antropométricas & Circunferências')).toBeVisible();

      // Cancel back to history
      await page.getByRole('button', { name: 'Cancelar' }).click();
      await expect(page.getByText('Avaliação Inicial')).toBeVisible();
    });

    test('7. Filtrar Tabela de Exames Clínicos', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      // Navigate to Saúde (opens labs by default)
      const healthTab = page.getByRole('button', { name: 'Saúde' });
      await healthTab.click();

      await expect(page.getByText('Glicose: 89 mg/dL')).toBeVisible();

      // Search filter in lab results
      const searchInput = page.getByPlaceholder(/Buscar laudo/i);
      if (await searchInput.isVisible()) {
        await searchInput.fill('Apolipoproteína');
        await expect(page.getByText('Apolipoproteína: 72 mg/dL')).toBeVisible();

        // Clear filter
        await searchInput.fill('');
        await expect(page.getByText('Glicose: 89 mg/dL')).toBeVisible();
      }
    });

    test('8. Alternar Tema Dark/Light no Header', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const themeToggle = page.getByLabel(/Alternar para tema/i).first();
      await expect(themeToggle).toBeVisible();

      const html = page.locator('html');
      const isInitiallyDark = await html.evaluate(el => el.classList.contains('dark'));

      // Click to toggle
      await themeToggle.click();

      // Verify theme toggled
      const isNowDark = await html.evaluate(el => el.classList.contains('dark'));
      expect(isNowDark).toBe(!isInitiallyDark);
    });
  });
}
