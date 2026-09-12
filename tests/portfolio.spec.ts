import { test, expect, type Page } from '@playwright/test';

const PUBLIC_URL = process.env.PUBLIC_URL ?? 'https://mokhtar-amr.vercel.app';
const ADMIN_URL = process.env.ADMIN_URL ?? 'https://admin-cms-mocha.vercel.app/admin';

async function scrollToBottom(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const height = () => document.body.scrollHeight;
    let y = 0;
    while (y < height()) {
      window.scrollTo(0, y);
      await delay(250);
      y += window.innerHeight * 0.8;
    }
  });
}

test.describe('Public Portfolio', () => {
  test('page loads with HTTP 200 status', async ({ request }) => {
    const res = await request.get(PUBLIC_URL);
    expect(res.status()).toBe(200);
  });

  test('projects, certificates, and volunteering sections render', async ({ page }) => {
    await page.goto(PUBLIC_URL, { waitUntil: 'networkidle' });

    const projects = page.locator('#projects');
    await expect(projects).toBeVisible();
    await expect(projects.locator('.project-card').first()).toBeVisible();

    const certificates = page.locator('#certificates');
    await expect(certificates).toBeVisible();
    await expect(certificates.locator('.cert-grid .cert-card').first()).toBeVisible();

    const volunteering = page.locator('#volunteer');
    await expect(volunteering).toBeVisible();
    await expect(volunteering.locator('.volunteer-grid .volunteer-card').first()).toBeVisible();
  });

  test('no broken images or missing asset links', async ({ page }) => {
    const failures: string[] = [];

    page.on('response', (res) => {
      if (['image', 'media', 'font'].includes(res.request().resourceType()) && res.status() >= 400) {
        failures.push(`${res.status()} ${res.url()}`);
      }
    });
    page.on('requestfailed', (req) => failures.push(`REQUEST FAILED ${req.url()}`));

    await page.goto(PUBLIC_URL, { waitUntil: 'networkidle' });

    await scrollToBottom(page);
    await page.waitForTimeout(1500);
    await page.waitForFunction(
      () => Array.from(document.images).every((img) => img.complete),
      undefined,
      { timeout: 15000 },
    );

    const brokenImages = await page.evaluate(() =>
      Array.from(document.images)
        // Skip the lazy lightbox — its src is only set when the user opens an image
        .filter((img) => img.closest('.lightbox') === null)
        .filter((img) => img.complete && img.naturalWidth === 0)
        .map((img) => img.getAttribute('src') || img.currentSrc),
    );

    expect(
      brokenImages,
      `Broken images: ${brokenImages.join(', ') || 'none'}`,
    ).toEqual([]);
    expect(failures, `Failed asset requests: ${failures.join('; ') || 'none'}`).toEqual([]);
  });
});

test.describe('Admin CMS (/admin)', () => {
  test('displays the login form when unauthenticated', async ({ page }) => {
    await page.goto(ADMIN_URL, { waitUntil: 'networkidle' });

    await expect(page.getByRole('heading', { name: 'Portfolio Admin' })).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('invalid login shows error messaging', async ({ page }) => {
    await page.goto(ADMIN_URL, { waitUntil: 'networkidle' });

    await page.locator('#email').fill('qa-invalid@example.com');
    await page.locator('#password').fill('definitely-wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    const errorBanner = page.locator('form .text-red-400');
    await expect(errorBanner).toBeVisible({ timeout: 15000 });
    await expect(errorBanner).toContainText(/invalid login credentials|invalid/i);
  });
});