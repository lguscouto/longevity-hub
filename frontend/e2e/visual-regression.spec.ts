import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const PACKAGE_VERSION = JSON.parse(
  fs.readFileSync(new URL('../package.json', import.meta.url), 'utf-8'),
).version as string;
const BASELINE_VERSION = `v${PACKAGE_VERSION}`;

const mockApi = async (page: Page) => {
  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });
  await page.route('**/api/owner/session', route => route.fulfill({ json: { authenticated: true } }));

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
          photos: [],
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
  await page.route('**/api/profile', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        name: 'Carlos Oliveira',
        birth_date: '1988-06-15',
        chronological_age: 38.0,
        height_cm: 178,
        weight_kg: 74.5,
        target_weight_kg: 72.0,
        activity_level: 'Ativo',
        health_goals: 'Otimização metabólica, aumento de massa magra e longevidade cardiovascular.',
        allergies: 'Nenhuma',
        medications: 'Nenhum',
        timezone: 'America/Sao_Paulo',
        language: 'pt-BR',
      }),
    });
  });

  await page.route('**/api/pipeline-runs**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 1,
          source: 'zepp',
          started_at: '2026-10-03T07:00:00Z',
          finished_at: '2026-10-03T07:00:15Z',
          status: 'success',
          records_processed: 1440,
          details: 'Sincronização biométrica completa: RHR, HRV e estágios de sono processados.',
        },
      ]),
    });
  });

  await page.route('**/api/quality/daily**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        date_ref: '2026-10-03',
        coverage_pct: 95.5,
        confidence: 'high',
        metrics_available: 12,
        metrics_expected: 12,
        warnings: [],
        sources: ['zepp', 'hevy'],
        items: [
          { metric_key: 'rhr_bpm', metric_name: 'Frequência Cardíaca de Repouso', status: 'optimal', value: 48, unit: 'bpm' },
          { metric_key: 'hrv_ms', metric_name: 'Variabilidade da Frequência Cardíaca', status: 'optimal', value: 64.5, unit: 'ms' },
          { metric_key: 'sleep_minutes', metric_name: 'Tempo de Sono Total', status: 'optimal', value: 465, unit: 'min' },
        ],
      }),
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
  { id: 'ai', title: 'IA e Copiloto' },
  { id: 'profile', title: 'Perfil' },
];

const THEMES = ['dark', 'light'] as const;

interface BaselineMetadata {
  id: string;
  version: string;
  view: string;
  view_title: string;
  viewport: {
    key: string;
    name: string;
    width: number;
    height: number;
  };
  theme: string;
  reduced_motion: boolean;
  state: string;
  filename: string;
  captured_at: string;
}

const collectedBaselines: BaselineMetadata[] = [];

test.describe('Comparação visual — 24 telas de referência', () => {
  test.use({ timezoneId: 'America/Sao_Paulo', locale: 'pt-BR' });

  test.afterAll(async ({}, testInfo) => {
    const isUpdate = testInfo.config.updateSnapshots !== 'none';
    if (isUpdate && collectedBaselines.length > 0) {
      const baselinesDir = path.dirname(testInfo.snapshotPath(collectedBaselines[0].filename, { kind: 'screenshot' }));
      if (!fs.existsSync(baselinesDir)) {
        fs.mkdirSync(baselinesDir, { recursive: true });
      }

      const metadataPath = path.join(baselinesDir, 'metadata.json');
      let existing: BaselineMetadata[] = [];
      if (fs.existsSync(metadataPath)) {
        try {
          const raw = fs.readFileSync(metadataPath, 'utf-8');
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.baselines)) {
            existing = parsed.baselines;
          }
        } catch {
          // ignore parse errors
        }
      }

      const mergedMap = new Map<string, BaselineMetadata>();
      for (const b of existing) {
        mergedMap.set(b.id, b);
      }
      for (const b of collectedBaselines) {
        mergedMap.set(b.id, b);
      }

      const allBaselines = Array.from(mergedMap.values());
      const manifest = {
        version: PACKAGE_VERSION,
        platform: process.platform,
        generated_at: new Date().toISOString(),
        reduced_motion: true,
        canonical_viewports: BASELINE_VIEWPORTS,
        canonical_themes: THEMES,
        canonical_views: CANONICAL_VIEWS,
        total_baselines: allBaselines.length,
        baselines: allBaselines,
      };

      fs.writeFileSync(metadataPath, JSON.stringify(manifest, null, 2), 'utf-8');
    }
  });

  for (const vp of BASELINE_VIEWPORTS) {
    for (const theme of THEMES) {
      for (const view of CANONICAL_VIEWS) {
        const testTitle = `[${BASELINE_VERSION}] ${view.title} (${view.id}) on ${vp.name} [${theme}]`;

        test(testTitle, async ({ page }) => {
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
          await page.clock.setFixedTime(new Date('2026-10-03T15:00:00Z'));
          await page.addInitScript((targetTheme) => localStorage.setItem('longevity-hub-theme', targetTheme), theme);
          await mockApi(page);

          await page.goto(`/#${view.id}`);
          await page.waitForLoadState('networkidle');
          const navigation = page.getByRole('navigation', { name: 'Navegação Principal' });
          await expect(navigation.getByRole('button', { name: view.title, exact: true })).toHaveAttribute('aria-current', 'page');
          await expect(page.locator('main')).toBeVisible();
          await expect(page.getByText(/ChunkLoadError|ReferenceError|Erro ao carregar componente/)).not.toBeVisible();

          const filename = `${BASELINE_VERSION}_${view.id}_${vp.key}_${theme}_normal.png`;
          await expect(page).toHaveScreenshot([filename], {
            fullPage: false,
            animations: 'disabled',
            maxDiffPixelRatio: 0.01,
          });

          // Registra metadados estruturados (U22-P2-22)
          collectedBaselines.push({
            id: `${view.id}_${vp.key}_${theme}_normal`,
            version: PACKAGE_VERSION,
            view: view.id,
            view_title: view.title,
            viewport: {
              key: vp.key,
              name: vp.name,
              width: vp.width,
              height: vp.height,
            },
            theme,
            reduced_motion: true,
            state: 'normal',
            filename,
            captured_at: new Date().toISOString(),
          });

        });
      }
    }
  }
});
