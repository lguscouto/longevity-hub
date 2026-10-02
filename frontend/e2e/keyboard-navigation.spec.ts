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
        markdown: '# Relatório Clínico\n\nPaciente em acompanhamento de biomarcadores.',
      }),
    });
  });

  await page.route('**/api/metrics**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          date_ref: new Date().toISOString().slice(0, 10),
          steps: 8500,
          rhr_bpm: 49,
          hrv_ms: 60,
          sleep_minutes: 450,
          vo2_max: 45,
          calories: 2200,
          respiratory_rate_rpm: 14,
          spo2_avg_pct: 98,
          training_load_daily: 100,
          training_load_rolling: 450,
          training_load_optimal_min: 400,
          training_load_optimal_max: 700,
          workout_count: 1,
          workout_duration_min: 60,
        },
      ]),
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
};

test.describe('UX_UI_25: Keyboard Navigation & Focus Visible Audit', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('1. Sequência Tab no Header navega controles interativos', async ({ page }) => {
    // Press Tab multiple times from top of page
    await page.keyboard.press('Tab');
    
    // Check that activeElement is receiving focus
    const hasFocusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return el !== null && el !== document.body;
    });
    expect(hasFocusedElement).toBe(true);

    // Tab through buttons and verify focus changes
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }

    const currentFocusedTag = await page.evaluate(() => {
      return document.activeElement ? document.activeElement.tagName.toLowerCase() : null;
    });
    expect(['button', 'a', 'input']).toContain(currentFocusedTag);
  });

  test('2. Abertura e fechamento de modal via Teclado (Enter / Escape) com Focus Trap', async ({ page }) => {
    // Focus Registrar Métrica button directly
    const openBtn = page.getByRole('button', { name: 'Registrar Métrica' });
    await openBtn.focus();
    await expect(openBtn).toBeFocused();

    // Trigger modal opening via Enter key
    await page.keyboard.press('Enter');

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Verify focus is trapped inside the dialog (close button or first interactive element focused)
    const isFocusInsideModal = await page.evaluate(() => {
      const modalEl = document.querySelector('[role="dialog"]');
      return modalEl ? modalEl.contains(document.activeElement) : false;
    });
    expect(isFocusInsideModal).toBe(true);

    // Tab through inputs inside modal
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Press Escape to dismiss modal
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('3. Doctor Briefing: Abertura e fechamento via Teclado com Escape', async ({ page }) => {
    const briefingBtn = page.getByRole('button', { name: 'Doctor Briefing' });
    await briefingBtn.focus();
    await expect(briefingBtn).toBeFocused();

    await page.keyboard.press('Enter');

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Press Escape to dismiss
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('4. Navegação por teclado em botões e controles contextuais', async ({ page }) => {
    // Focus "Dia Anterior" button
    const prevBtn = page.getByTitle('Dia Anterior');
    await prevBtn.focus();
    await expect(prevBtn).toBeFocused();

    // Tab from "Dia Anterior" into the Date input
    await page.keyboard.press('Tab');
    const isInputFocused = await page.evaluate(() => {
      return document.activeElement?.tagName.toLowerCase() === 'input';
    });
    expect(isInputFocused).toBe(true);
  });
});
