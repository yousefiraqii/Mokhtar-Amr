import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'url';
import path from 'path';

const INDEX = path.resolve(__dirname, '../index.html');
const indexUrl = (query = '') => pathToFileURL(INDEX).href + query;

test.describe('ATS CV — deep link & modal', () => {
  test('?certificate=<id> opens that exact certificate in the lightbox', async ({ page }) => {
    // Isolate from Supabase so the static cert grid (data-cert-id = 1..36) is used.
    await page.route('**/supabase-integration.js', (route) => route.abort());
    await page.route('**/supabase-config.js', (route) => route.abort());
    await page.route('**/supabase-js@2', (route) => route.abort());

    await page.goto(indexUrl('?certificate=2'), { waitUntil: 'domcontentloaded' });

    await expect(page.locator('#lightbox')).toHaveClass(/open/);
    await expect(page.locator('#lightboxImg')).toHaveAttribute('src', /Certificates\/002\.jpg$/);
    await page.locator('#lightboxClose').click();
    await expect(page.locator('#lightbox')).not.toHaveClass(/open/);
  });

  test('Generate ATS CV modal exposes the job-targeting box and falls back gracefully when the API is down', async ({
    page,
  }) => {
    await page.route('**/supabase-integration.js', (route) => route.abort());
    await page.route('**/supabase-config.js', (route) => route.abort());
    await page.route('**/supabase-js@2', (route) => route.abort());
    await page.addInitScript(() => {
      (window as any).ATS_CV_ENDPOINT = 'http://127.0.0.1:1/ats-cv';
    });

    await page.goto(indexUrl(), { waitUntil: 'domcontentloaded' });
    await page.click('#navCvBtn');

    const overlay = page.locator('#cvOverlay');
    await expect(overlay).toHaveClass(/open/);
    await expect(page.locator('#cvJobBox')).toBeVisible();
    await expect(page.locator('#cvGenerate')).toBeVisible();

    await page.locator('#cvJobText').fill('Frontend developer: HTML, CSS, JavaScript, UI/UX, responsive design.');
    await page.click('#cvGenerate');

    // API unreachable -> deterministic fallback preview is still rendered.
    await expect(page.locator('#cvPreview .cv-row').first()).toBeVisible({ timeout: 20000 });
    await expect(page.locator('#cvPreview strong').first()).not.toBeEmpty();
  });

  test('deep link with an unknown id leaves the page untouched (no broken lightbox)', async ({ page }) => {
    await page.route('**/supabase-integration.js', (route) => route.abort());
    await page.route('**/supabase-config.js', (route) => route.abort());
    await page.route('**/supabase-js@2', (route) => route.abort());

    await page.goto(indexUrl('?certificate=does-not-exist'), { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await expect(page.locator('#lightbox')).not.toHaveClass(/open/);
  });
});