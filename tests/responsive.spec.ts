import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'url';
import path from 'path';

const INDEX = path.resolve(__dirname, '../index.html');
const indexUrl = (query = '') => pathToFileURL(INDEX).href + query;
const ADMIN_BASE_URL = (process.env.ADMIN_URL ?? 'https://admin-cms-mocha.vercel.app').replace(/\/$/, '');
const ADMIN_LOGIN_URL = `${ADMIN_BASE_URL}/admin/login`;

const MOBILE_VIEWPORTS: Array<[number, number]> = [
  [320, 568],
  [360, 800],
  [375, 812],
  [390, 844],
  [412, 915],
  [430, 932],
];

async function isolateFromSupabase(page: Page) {
  await page.route('**/supabase-integration.js', (r) => r.abort());
  await page.route('**/supabase-config.js', (r) => r.abort());
  await page.route('**/supabase-js@2', (r) => r.abort());
  await page.addInitScript(() => {
    (window as any).ATS_CV_ENDPOINT = 'http://127.0.0.1:1/ats-cv';
  });
}

async function waitForPage(page: Page) {
  await page.goto(indexUrl(), { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.cert-card', { timeout: 15000 });
}

async function collectOverflow(page: Page) {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const out: { tag: string; cls: string; left: number; right: number; text: string }[] = [];
    document.querySelectorAll<HTMLElement>('body *').forEach((el) => {
      if (el.closest('[aria-hidden="true"]') && !el.closest('.project-card,.cert-card,.volunteer-card,.research-card,.site-nav,.cv-overlay,.lightbox')) return;
      if (el.classList.contains('giant-word') || el.classList.contains('section-bg-word') || el.closest('.portrait-wrap')) return;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      if (r.left < -0.5 || r.right > vw + 0.5) {
        out.push({ tag: el.tagName, cls: el.className.toString().slice(0, 60), left: Math.round(r.left), right: Math.round(r.right), text: (el.textContent || '').trim().slice(0, 30) });
      }
    });
    return out;
  });
}

async function pageOverflow(page: Page) {
  return page.evaluate(() => ({
    docSW: document.documentElement.scrollWidth,
    docCW: document.documentElement.clientWidth,
    bodySW: document.body.scrollWidth,
    bodyCW: document.body.clientWidth,
  }));
}

function rectsWithin(view: { left: number; right: number; top: number; bottom: number }, vw: number) {
  return view.left >= -0.5 && view.right <= vw + 0.5;
}

for (const [w, h] of MOBILE_VIEWPORTS) {
  test.describe(`Public portfolio @ ${w}px`, () => {
    test.use({ viewport: { width: w, height: h } });

    test('no horizontal overflow; header and key controls fit', async ({ page }) => {
      await isolateFromSupabase(page);
      await waitForPage(page);
      await page.waitForTimeout(400);

      const overflow = await pageOverflow(page);
      expect(overflow.docSW, 'doc scrollWidth vs clientWidth').toBeLessThanOrEqual(overflow.docCW);
      expect(overflow.bodySW, 'body scrollWidth vs clientWidth').toBeLessThanOrEqual(overflow.bodyCW);

      const nav = await page.locator('.site-nav').boundingBox();
      expect(nav, 'nav is in viewport').toBeTruthy();
      expect(nav!.x).toBeGreaterThanOrEqual(-0.5);
      expect(nav!.x + nav!.width).toBeLessThanOrEqual(w + 0.5);

      for (const sel of ['.nav-logo', '.nav-cv', '.nav-toggle']) {
        const b = await page.locator(sel).boundingBox();
        expect(b, `${sel} should be visible and inside viewport`).toBeTruthy();
        expect(b!.x).toBeGreaterThanOrEqual(-0.5);
        expect(b!.x + b!.width, `${sel} right edge`).toBeLessThanOrEqual(w + 0.5);
      }

      const violations = await collectOverflow(page);
      const notable = violations.filter((v) => v.tag !== 'BODY');
      expect(notable, `elements exceeding viewport: ${JSON.stringify(notable.slice(0, 5))}`).toEqual([]);
    });

    test('mobile menu opens, items are tappable, and closes on link click', async ({ page }) => {
      await isolateFromSupabase(page);
      await waitForPage(page);

      await page.click('.nav-toggle');
      await expect(page.locator('#primaryNav')).toHaveClass(/open/);
      const link = page.locator('#primaryNav a').first();
      await expect(link).toBeVisible();
      const box = await link.boundingBox();
      expect(box!.height, 'tappable link height').toBeGreaterThanOrEqual(40);
      await link.click();
      await expect(page.locator('#primaryNav')).not.toHaveClass(/open/);
    });

    test('sections use single-column layouts and grids fit the viewport', async ({ page }) => {
      await isolateFromSupabase(page);
      await waitForPage(page);

      const cols = await page.evaluate(() => {
        function tracks(sel: string) {
          const el = document.querySelector<HTMLElement>(sel);
          return el ? getComputedStyle(el).gridTemplateColumns.split(' ').length : -1;
        }
        return {
          projects: tracks('.projects-grid'),
          volunteer: tracks('.volunteer-grid'),
          research: tracks('.research-grid'),
          certs: tracks('.cert-grid'),
        };
      });
      if (w < 600) expect(cols.projects).toBe(1);
      if (w >= 600) expect(cols.projects).toBe(w < 980 ? 2 : 3);
      expect(cols.volunteer).toBe(1);
      expect(cols.research).toBe(1);
      const expectedCerts = w < 540 ? 2 : w < 768 ? 3 : 4;
      expect(cols.certs).toBe(expectedCerts);

      for (const sel of ['.project-card', '.volunteer-card', '.research-card', '.cert-card']) {
        const count = await page.locator(sel).count();
        expect(count, `${sel} present`).toBeGreaterThan(0);
        const first = await page.locator(sel).first().boundingBox();
        expect(first!.x + first!.width).toBeLessThanOrEqual(w + 0.5);
      }
    });

    test('ATS CV modal fits the viewport and buttons do not overflow', async ({ page }) => {
      await isolateFromSupabase(page);
      await waitForPage(page);

      await page.click('#navCvBtn');
      await expect(page.locator('#cvOverlay')).toHaveClass(/open/);
      const modal = page.locator('.cv-modal').boundingBox();
      const m = await modal;
      expect(m!.x).toBeGreaterThanOrEqual(-0.5);
      expect(m!.x + m!.width).toBeLessThanOrEqual(w + 0.5);
      await page.click('#cvClose');
      await expect(page.locator('#cvOverlay')).not.toHaveClass(/open/);
    });

    test('lightbox fits the viewport', async ({ page }) => {
      await isolateFromSupabase(page);
      await waitForPage(page);

      await page.evaluate(() => (document as any).getElementById('lightbox').classList.add('open'));
      const inner = await page.locator('.lightbox-inner').boundingBox();
      expect(inner!.x).toBeGreaterThanOrEqual(-0.5);
      expect(inner!.x + inner!.width).toBeLessThanOrEqual(w + 0.5);
      await page.evaluate(() => (document as any).getElementById('lightbox').classList.remove('open'));
    });
  });
}

test.describe('Public portfolio desktop regression (1280px)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('desktop layout is unchanged: full nav, multi-column grids, hero composition', async ({ page }) => {
    await isolateFromSupabase(page);
    await waitForPage(page);

    await expect(page.locator('.nav-toggle')).toBeHidden();
    await expect(page.locator('#primaryNav a').first()).toBeVisible();
    await expect(page.locator('.quote-badge')).toBeVisible();

    const cols = await page.evaluate(() => {
      function tracks(sel: string) {
        const el = document.querySelector<HTMLElement>(sel);
        return el ? getComputedStyle(el).gridTemplateColumns.split(' ').length : -1;
      }
      return {
        projects: tracks('.projects-grid'),
        certs: tracks('.cert-grid'),
        volunteer: tracks('.volunteer-grid'),
        research: tracks('.research-grid'),
      };
    });
    expect(cols.projects).toBe(3);
    expect(cols.certs).toBe(6);
    expect(cols.volunteer).toBe(2);
    expect(cols.research).toBe(2);
    expect((await pageOverflow(page)).docSW).toBeLessThanOrEqual((await pageOverflow(page)).docCW);
  });

  test('all in-page asset references resolve to existing files (renamed paths intact)', async ({ page }) => {
    // No network needed: assert the domain of references on disk.
    const refs = await page.evaluate(() => {
      const urls: string[] = [];
      document.querySelectorAll('img[src], a[href]').forEach((el) => {
        const u = el.getAttribute('src') || el.getAttribute('href') || '';
        if (/^(https?:|#|mailto:|data:)/.test(u)) return;
        if (/\.(png|jpe?g|pdf)$/i.test(u)) urls.push(decodeURIComponent(u));
      });
      return urls;
    });

    const fs = await import('fs');
    const pathMod = await import('path');
    const base = pathMod.resolve(__dirname, '..');
    const missing: string[] = [];
    const withSpaces: string[] = [];
    for (const r of refs) {
      if (/\s/.test(r)) withSpaces.push(r);
      const diskPath = pathMod.resolve(base, r.split('/').join(pathMod.sep));
      if (!fs.existsSync(diskPath)) missing.push(r);
    }
    expect(withSpaces, 'no asset reference contains a space').toEqual([]);
    expect(missing, 'all referenced assets exist on disk').toEqual([]);
  });
});

test.describe('Admin CMS responsiveness', () => {
  test('login page has no horizontal overflow and the card fits on 375px and 1280px', async ({ page }) => {
    for (const [w, h] of [
      [375, 812],
      [1280, 800],
    ]) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(ADMIN_LOGIN_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('form input', { timeout: 20000 });
      const overflow = await page.evaluate(() => ({
        docSW: document.documentElement.scrollWidth,
        docCW: document.documentElement.clientWidth,
      }));
      expect(overflow.docSW, `@${w}px doc scrollWidth vs clientWidth`).toBeLessThanOrEqual(overflow.docCW);
      const card = await page.locator('.max-w-md').boundingBox();
      expect(card!.x + card!.width, `@${w}px card fits`).toBeLessThanOrEqual(w + 0.5);
    }
  });
});