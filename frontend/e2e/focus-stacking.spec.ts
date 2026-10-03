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
      }),
    });
  });
};

test.describe('Focus Stacking & Accessibility (UX21-P1-11, UX21-P1-12, UX21-P2-04)', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('1. Escape key dismisses the topmost modal dialog and restores body scroll', async ({ page }) => {
    // Open Manual Entry Modal via header button
    const openBtn = page.getByRole('button', { name: 'Registrar Métrica' });
    await openBtn.click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Verify document.body style is locked
    const isBodyOverflowHidden = await page.evaluate(() => document.body.style.overflow === 'hidden');
    expect(isBodyOverflowHidden).toBe(true);

    // Escape should close this modal and restore body scroll
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();

    const isBodyOverflowRestored = await page.evaluate(() => document.body.style.overflow !== 'hidden');
    expect(isBodyOverflowRestored).toBe(true);
  });

  test('2. Reduced motion overrides all animation durations to zero or sub-millisecond', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });

    // Open Doctor Briefing dialog
    const briefingBtn = page.getByRole('button', { name: 'Doctor Briefing' });
    await briefingBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Verify computed animation duration of elements under reduced motion
    const isDurationReduced = await page.evaluate(() => {
      const modalBackdrop = document.querySelector('[data-testid="modal-backdrop"]');
      if (!modalBackdrop) return false;
      const dur = window.getComputedStyle(modalBackdrop).animationDuration;
      return dur === '0s' || parseFloat(dur) < 0.001;
    });

    expect(isDurationReduced).toBe(true);
  });

  test('3. Focus trap restricts Tab navigation within the active dialog', async ({ page }) => {
    const openBtn = page.getByRole('button', { name: 'Registrar Métrica' });
    await openBtn.click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Press Tab multiple times
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab');
      const isInside = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]');
        return dialog ? dialog.contains(document.activeElement) : false;
      });
      expect(isInside).toBe(true);
    }
  });
});
