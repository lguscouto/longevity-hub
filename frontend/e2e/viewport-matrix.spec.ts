import { test, expect, type Page } from '@playwright/test';

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
          metric_name: 'Glicemia em Jejum',
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

  await page.route('**/api/kdm/latest', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ kdm_score: 0.82, biological_age: 36.1 }]),
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
        has_openai_key: false,
        has_anthropic_key: false,
        has_openrouter_key: false,
      }),
    });
  });

  await page.route('**/api/ai/history', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });

  await page.route('**/api/physical-assessments', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'test-assessment-1',
          date: '2026-03-15',
          weight_kg: 72.5,
          height_cm: 175,
          body_fat_pct: 14.2,
          muscle_mass_kg: 34.8,
          visceral_fat_level: 4,
          notes: 'Avaliação inicial de bioimpedância',
        },
      ]),
    });
  });

  await page.route('**/api/pipeline-runs*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

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
    });
  });

  await page.route('**/api/workouts**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: '1787006220',
          workout_date: '2026-08-18',
          workout_time: '15:30',
          category: 'Corrida',
          activity_type: 'Corrida',
          duration_min: 32.5,
          calories: 320,
          distance_km: 5.2,
          avg_hr: 145,
          max_hr: 168,
          training_effect: 32,
          steps: 4200,
          city: 'São Paulo',
          device: 'Amazfit Band 7',
          source: 'Zepp',
        },
      ]),
    });
  });
};

// 8 Canonical Viewports according to Master Plan §62:
// 320×568, 360×800, 375×667, 390×844, 414×896, 768×1024, 1024×1366, 1280×800
const VIEWPORT_MATRIX = [
  { name: '320x568 (Small Mobile)', width: 320, height: 568, isMobile: true, hasTouch: true },
  { name: '360x800 (Android Standard)', width: 360, height: 800, isMobile: true, hasTouch: true },
  { name: '375x667 (iPhone SE)', width: 375, height: 667, isMobile: true, hasTouch: true },
  { name: '390x844 (iPhone 14)', width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: '414x896 (iPhone Plus)', width: 414, height: 896, isMobile: true, hasTouch: true },
  { name: '768x1024 (iPad Portrait)', width: 768, height: 1024, isMobile: true, hasTouch: true },
  { name: '1024x1366 (iPad Pro / Small Laptop)', width: 1024, height: 1366, isMobile: false, hasTouch: false },
  { name: '1280x800 (Desktop Standard)', width: 1280, height: 800, isMobile: false, hasTouch: false },
];

// 6 Canonical Application Areas:
const CANONICAL_VIEWS = [
  { id: 'overview', name: 'Hoje', primaryNavIndex: 0, hasSubNav: false },
  { id: 'labs', name: 'Saúde', primaryNavIndex: 1, hasSubNav: true, activeSubTab: 'labs' },
  { id: 'workouts', name: 'Treinos', primaryNavIndex: 2, hasSubNav: false },
  { id: 'supplements', name: 'Intervenções', primaryNavIndex: 3, hasSubNav: true, activeSubTab: 'supplements' },
  { id: 'ai', name: 'IA', primaryNavIndex: 4, hasSubNav: false },
  { id: 'profile', name: 'Perfil', primaryNavIndex: 5, hasSubNav: true, activeSubTab: 'profile' },
];

async function checkHorizontalOverflow(page: Page, contextLabel: string) {
  const result = await page.evaluate(() => {
    const docWidth = window.innerWidth;
    const scrollW = document.documentElement.scrollWidth;
    const bodyScrollW = document.body.scrollWidth;

    function hasScrollParent(el: Element): boolean {
      let cur = el.parentElement;
      while (cur && cur !== document.body && cur !== document.documentElement) {
        const style = window.getComputedStyle(cur);
        if (['auto', 'scroll', 'hidden'].includes(style.overflowX)) return true;
        cur = cur.parentElement;
      }
      return false;
    }

    const uncontainedOverflowElements = Array.from(document.querySelectorAll('*'))
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.right > docWidth + 1 && !hasScrollParent(el);
      })
      .map((el) => ({
        tag: el.tagName,
        className: el.className ? String(el.className).slice(0, 80) : '',
        id: el.id,
        right: Math.round(el.getBoundingClientRect().right),
        docWidth,
      }));

    return {
      docWidth,
      scrollW,
      bodyScrollW,
      badElements: uncontainedOverflowElements,
    };
  });

  if (result.scrollW > result.docWidth || result.badElements.length > 0) {
    console.log(`[${contextLabel}] Overflow detected: scrollW=${result.scrollW}, docWidth=${result.docWidth}, badElements:`, JSON.stringify(result.badElements, null, 2));
  }

  expect(
    result.scrollW,
    `[${contextLabel}] documentElement.scrollWidth (${result.scrollW}px) must be <= innerWidth (${result.docWidth}px)`
  ).toBeLessThanOrEqual(result.docWidth);

  expect(
    result.badElements,
    `[${contextLabel}] Found uncontained overflowing elements: ${JSON.stringify(result.badElements)}`
  ).toEqual([]);

  return result;
}

test.describe('UX/UI 38 — Responsive Viewport Matrix (8 viewports × 6 views)', () => {
  for (const vp of VIEWPORT_MATRIX) {
    test(`Validates responsive layout and header metrics on ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await mockApi(page);

      // Open base app
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const headerHeightTelemetry: Record<string, number> = {};

      for (const view of CANONICAL_VIEWS) {
        // Navigate to view via hash
        await page.goto(`/#${view.id}`);
        await page.waitForTimeout(150);

        const contextLabel = `${vp.width}px - ${view.name}`;

        // 1. Verify zero horizontal document overflow
        await checkHorizontalOverflow(page, contextLabel);

        // 2. Verify primary navigation buttons exist and are visible
        const navButtons = page.locator('nav[aria-label="Navegação Principal"] button');
        const count = await navButtons.count();
        expect(count, `[${contextLabel}] Primary nav must have 6 buttons`).toBe(6);

        // 3. Verify active state aria-current="page" on the active primary tab
        const activePrimaryBtn = navButtons.nth(view.primaryNavIndex);
        await expect(activePrimaryBtn).toHaveAttribute('aria-current', 'page');
        await expect(activePrimaryBtn).toBeVisible();

        // 4. If view has subnav, verify active subnav item
        if (view.hasSubNav) {
          const activeSubNavBtn = page.locator('nav button[aria-current="page"]').filter({
            hasNot: activePrimaryBtn,
          });
          const subCount = await activeSubNavBtn.count();
          expect(subCount, `[${contextLabel}] Subnav must have an active button with aria-current="page"`).toBeGreaterThanOrEqual(1);

          // Verify active subnav button is visible within its viewport/container
          const firstSubActive = activeSubNavBtn.first();
          await expect(firstSubActive).toBeVisible();

          // Verify the active button is within scroll boundaries (not negative offscreen)
          const box = await firstSubActive.boundingBox();
          expect(box, `[${contextLabel}] Active subnav button must have bounding box`).not.toBeNull();
          if (box) {
            expect(box.x + box.width, `[${contextLabel}] Active subnav button right edge must be > 0`).toBeGreaterThan(0);
          }
        }

        // 5. Measure and record Header height
        const headerEl = page.locator('header');
        const headerBox = await headerEl.boundingBox();
        expect(headerBox, `[${contextLabel}] Header must have bounding box`).not.toBeNull();
        if (headerBox) {
          headerHeightTelemetry[view.name] = Math.round(headerBox.height);
        }
      }

      console.log(`[TELEMETRY] Header heights at ${vp.width}x${vp.height} (${vp.name}):`, JSON.stringify(headerHeightTelemetry));
    });
  }
});
