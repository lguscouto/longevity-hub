import { test, expect, type Page } from '@playwright/test';
import path from 'path';

const mockApi = async (page: Page) => {
  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });

  await page.route('**/api/metrics**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          date_ref: '2026-10-03',
          steps: 9200,
          rhr_bpm: 48,
          hrv_ms: 64.5,
          sleep_minutes: 465,
          vo2_max: 45.0,
          calories: 2200,
          respiratory_rate_rpm: 14.2,
          spo2_avg_pct: 99,
          training_load_daily: 120,
          training_load_rolling: 480,
          training_load_optimal_min: 400,
          training_load_optimal_max: 700,
          workout_count: 2,
          workout_duration_min: 75,
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
          collected_at: '2026-09-15',
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
          collected_at: '2026-09-15',
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
    });
  });

  await page.route('**/api/phenoage', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ phenoage: 34.2, chronological_age: 38.0, delta: -3.8 }]),
    });
  });

  await page.route('**/api/kdm', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ kdm_score: 0.82, biological_age: 35.5 }]),
    });
  });

  await page.route('**/api/supplements/logs/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });

  await page.route('**/api/supplements/audit-logs', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
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
          category: 'Sono & Relaxamento',
          active: true,
        },
      ]),
    });
  });

  await page.route('**/api/workouts/summary**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        total_workouts: 14,
        hevy_workouts: 10,
        zepp_workouts: 4,
        total_volume_kg: 16800,
        total_sets: 84,
        total_reps: 760,
        total_duration_min: 620,
        total_calories: 3800,
        avg_hr: 135,
      }),
    });
  });

  await page.route('**/api/workouts**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: '101',
          workout_date: '2026-10-02',
          workout_time: '08:00',
          category: 'Musculação',
          activity_type: 'Upper Body A',
          duration_min: 65,
          calories: 420,
          avg_hr: 128,
          max_hr: 156,
          source: 'hevy',
        },
      ]),
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
        has_openrouter_key: true,
      }),
    });
  });

  await page.route('**/api/ai/reports/latest', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 1,
        created_at: '2026-10-01T12:00:00Z',
        provider: 'openrouter',
        model: 'deepseek/deepseek-v4-flash-0731',
        privacy_mode: 'minimal',
        time_window: '30d',
        result: {
          summary: 'Recuperação autonômica estável com excelente densidade de treino e controle glicêmico.',
          insights: [
            {
              category: 'sono_hrv',
              headline: 'Recuperação Vagal Otimizada',
              insight_text: 'HRV média dos últimos 30 dias manteve-se em 64.5ms com baixo desvio padrão noturno.',
              actionable_steps: 'Manter a rotina de desaceleração 1h antes do repouso.',
            },
          ],
        },
      }),
    });
  });

  await page.route('**/api/ai/reports', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 1,
          created_at: '2026-10-01T12:00:00Z',
          provider: 'openrouter',
          model: 'deepseek/deepseek-v4-flash-0731',
          privacy_mode: 'minimal',
          time_window: '30d',
          summary: 'Recuperação autonômica estável com excelente densidade de treino.',
        },
      ]),
    });
  });

  await page.route('**/api/physical-assessments', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'assessment-baseline-1',
          date: '2026-09-20',
          weight_kg: 72.8,
          height_cm: 175,
          body_fat_pct: 13.8,
          muscle_mass_kg: 35.2,
          visceral_fat_level: 4,
          notes: 'Avaliação física de referência no protocolo longevidade',
        },
      ]),
    });
  });
};

const BASELINE_VIEWPORTS = [
  { key: '375x667', name: 'Mobile (375x667)', width: 375, height: 667 },
  { key: '1280x800', name: 'Desktop (1280x800)', width: 1280, height: 800 },
];

const CANONICAL_VIEWS = [
  { id: 'overview', title: 'Hoje' },
  { id: 'labs', title: 'Saúde' },
  { id: 'workouts', title: 'Treinos' },
  { id: 'supplements', title: 'Intervenções' },
  { id: 'ai', title: 'IA' },
  { id: 'profile', title: 'Perfil' },
];

const THEMES = ['dark', 'light'] as const;

test.describe('UX/UI 45 — Visual Regression & Baseline Capture (24 Canonical Baselines)', () => {
  for (const vp of BASELINE_VIEWPORTS) {
    for (const theme of THEMES) {
      for (const view of CANONICAL_VIEWS) {
        const testTitle = `[v2.1.0] ${view.title} (${view.id}) on ${vp.name} [${theme}]`;

        test(testTitle, async ({ page }) => {
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
          await mockApi(page);

          await page.goto(`/#${view.id}`);
          await page.waitForLoadState('networkidle');

          // Configura o tema no elemento raiz
          await page.evaluate((targetTheme) => {
            if (targetTheme === 'dark') {
              document.documentElement.classList.add('dark');
              localStorage.setItem('theme', 'dark');
            } else {
              document.documentElement.classList.remove('dark');
              localStorage.setItem('theme', 'light');
            }
          }, theme);

          await page.waitForTimeout(100);

          // Salva screenshot canônico versionado
          const filename = `v2.1.0_${view.id}_${vp.key}_${theme}_normal.png`;
          const screenshotPath = path.resolve(
            process.cwd(),
            '../docs/screenshots/baselines',
            filename
          );

          await page.screenshot({
            path: screenshotPath,
            fullPage: false,
            animations: 'disabled',
          });

          // Validações fundamentais de renderização e acessibilidade
          const mainContent = page.locator('main');
          await expect(mainContent).toBeVisible();

          // Valida ausência de erro de carregamento crítico
          await expect(page.locator('text=ChunkLoadError')).not.toBeVisible();
          await expect(page.locator('text=ReferenceError')).not.toBeVisible();
        });
      }
    }
  }
});
