/**
 * ============================================================================
 * MASTER TEST SUITE — Mokhtar Amr Portfolio
 * ============================================================================
 * Stack covered:
 *   - Static site        : vanilla HTML5/CSS3/JS  (index.html, *.js at repo root)
 *   - Supabase (public)  : supabase-config.js, supabase-integration.js (vanilla JS)
 *   - Admin CMS          : Next.js 16 (App Router, proxy.ts) + React 19 + TypeScript
 *                          + @supabase/ssr 0.12.x + @supabase/supabase-js 2.x + Tailwind 4
 *   - E2E (this project) : Playwright Test 1.63.x (@playwright/test)
 *
 * Suite layout (organized in describe() blocks):
 *   1. Unit — supabase-integration.js rendered against a real DOM with a MOCKED
 *      Supabase client (external API dependency stubbed; runs fully offline).
 *   2. Unit — supabase-config.js shape + stack manifest sanity (package.json deps).
 *   3. Integration — public portfolio site (deployed or PUPLIC_URL env override).
 *   4. Integration — Admin CMS login + proxy() auth-guard redirect behavior.
 *
 * Run (from repo root):
 *   npm install -D @playwright/test        # if not already installed
 *   npx playwright install chromium        # first-time browser download
 *   npx playwright test tests/master.spec.ts
 *
 * Optional env overrides:
 *   PUBLIC_URL=https://...   (target public portfolio; default is prod URL)
 *   ADMIN_URL=https://...    (target admin CMS; default is prod URL)
 * ============================================================================
 */

import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const PUBLIC_URL = process.env.PUBLIC_URL ?? 'https://mokhtar-amr.vercel.app';
const ADMIN_BASE_URL = (process.env.ADMIN_URL ?? 'https://admin-cms-mocha.vercel.app').replace(/\/$/, '');
const ADMIN_URL = `${ADMIN_BASE_URL}/admin`;

const INTEGRATION_SCRIPT = path.join(ROOT, 'supabase-integration.js');
const CONFIG_SCRIPT = path.join(ROOT, 'supabase-config.js');

/* 1x1 transparent PNG used to stub image responses for deterministic rendering. */
const PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

/* Minimal markup exposing exactly the selectors supabase-integration.js targets. */
const DOM_FIXTURE = `<!DOCTYPE html><html><body>
  <div class="topbar"><span class="role"></span><span class="sub"></span></div>
  <div class="left-copy">
    <p class="greeting">Loading…</p>
    <h1 class="name">Name</h1>
    <div class="role-line">Role</div>
    <p class="desc">Desc</p>
  </div>
  <div class="stats">
    <div class="stat"><span class="num"></span><span class="label"></span></div>
    <div class="stat"><span class="num"></span><span class="label"></span></div>
    <div class="stat"><span class="num"></span><span class="label"></span></div>
  </div>
  <div class="projects-grid"></div>
  <div id="certGrid"></div>
  <div id="certificates"><div class="eyebrow">Certificates</div></div>
  <div class="volunteer-grid"></div>
  <div class="research-grid"></div>
</body></html>`;

/* A non-secret placeholder config — never reference the real publishable key. */
const VALID_CONFIG = { url: 'https://example.supabase.co', anonKey: 'sb_publishable_test_placeholder' };

/** Attach a console sink; returns all messages captured for the page. */
async function attachConsole(page: Page): Promise<{ type: string; text: string }[]> {
  const logs: { type: string; text: string }[] = [];
  page.on('console', (m) => logs.push({ type: m.type(), text: m.text() }));
  return logs;
}

/**
 * Load supabase-integration.js (the real production file) into `page` with a
 * stubbed `window.supabase` AND a stubbed `window.SUPABASE_CONFIG`, then run the
 * IIFE. `tables` mirrors what `supabase.from('<table>')` should return:
 *   tables[table] = { rows, error?, throwError? }
 * Returns the loaded script path so callers can await timing if needed.
 */
async function renderWithSupabase(
  page: Page,
  options: { config?: object; tables?: Record<string, any>; includeClient?: boolean; images?: 'ok' | 'fail' } = {},
): Promise<void> {
  const { config = VALID_CONFIG, tables = {}, includeClient = true, images = 'ok' } = options;

  if (images === 'ok') {
    await page.route(/\.(png|jpe?g|gif|webp|svg)$/i, (route) =>
      route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL_PNG }),
    );
  } else {
    await page.route(/\.(png|jpe?g|gif|webp|svg)$/i, (route) =>
      route.fulfill({ status: 404, body: 'not found' }),
    );
  }

  await page.setContent(DOM_FIXTURE);
  await page.evaluate(
    ({ cfg, tbls, hasClient }) => {
      // @ts-expect-error — test-only global injected on window
      window.SUPABASE_CONFIG = cfg;

      if (hasClient) {
        // @ts-expect-error — test-only global injected on window
        window.supabase = {
          createClient() {
            return {
              from(table: string) {
                const settings: any = tbls[table] || {};
                const rows: any[] = settings.rows || [];
                let requestedSingle = false;

                const api: any = {
                  select: () => api,
                  order: () => api,
                  limit: () => api,
                  single: () => {
                    requestedSingle = true;
                    return api;
                  },
                  then: (resolve: any, reject: any) =>
                    Promise.resolve().then(() => {
                      if (settings.throwError) {
                        reject(new Error('Simulated database failure'));
                        return;
                      }
                      if (settings.error) {
                        resolve({
                          data: requestedSingle ? rows[0] ?? null : null,
                          error: settings.error,
                        });
                        return;
                      }
                      resolve({ data: requestedSingle ? rows[0] ?? null : rows });
                    }),
                };
                return api;
              },
            };
          },
        };
      }
    },
    { cfg: config, tbls: tables, hasClient: includeClient },
  );

  await page.addScriptTag({ path: INTEGRATION_SCRIPT });
  // Allow the async IIFE's microtasks to complete before asserting.
  await page.waitForTimeout(120);
}

async function readHero(page: Page) {
  return page.evaluate(() => ({
    greeting: document.querySelector('.left-copy .greeting')?.textContent,
    name: document.querySelector('.left-copy .name')?.innerHTML,
    role: document.querySelector('.topbar .role')?.textContent,
    sub: document.querySelector('.topbar .sub')?.textContent,
    roleLine: document.querySelector('.left-copy .role-line')?.innerHTML,
    desc: document.querySelector('.left-copy .desc')?.textContent,
    stats: Array.from(document.querySelectorAll('.stats .stat')).map((s) => ({
      num: s.querySelector('.num')?.innerHTML,
      label: s.querySelector('.label')?.innerHTML,
    })),
  }));
}

async function readProjects(page: Page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('.projects-grid .project-card')).map((c) => ({
      single: !!c.querySelector('.project-photos.single'),
      imgs: c.querySelectorAll('.project-photos img').length,
      index: c.querySelector('.project-index')?.textContent,
      title: c.querySelector('.project-title')?.textContent,
      desc: c.querySelector('.project-desc')?.textContent,
      btn: c.querySelector('.btn-solid')?.getAttribute('href') ?? null,
      fallbackFlex: (c.querySelector('.img-fallback') as HTMLElement | null)?.style.display === 'flex',
    })),
  );
}

async function readCerts(page: Page) {
  return page.evaluate(() => ({
    cards: Array.from(document.querySelectorAll('#certGrid .cert-card')).map((c) => ({
      img: c.querySelector('img')?.getAttribute('src') ?? null,
      caption: c.getAttribute('data-caption'),
      title: c.querySelector('.cert-title')?.textContent,
      desc: c.querySelector('.cert-desc')?.textContent ?? null,
      fallbackFlex: (c.querySelector('.img-fallback') as HTMLElement | null)?.style.display === 'flex',
    })),
    eyebrow: document.querySelector('#certificates .eyebrow')?.textContent,
  }));
}

async function readVolunteering(page: Page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('.volunteer-grid .volunteer-card')).map((c) => ({
      photosClass: c.querySelector('.volunteer-photos')?.className ?? null,
      imgs: c.querySelectorAll('.volunteer-photos img').length,
      title: c.querySelector('.volunteer-title')?.textContent,
      desc: c.querySelector('.volunteer-desc')?.textContent,
    })),
  );
}

async function readResearch(page: Page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('.research-grid .research-card')).map((c) => ({
      venue: c.querySelector('.research-venue')?.textContent,
      coverImg: !!c.querySelector('.research-cover img'),
      fallbackFlex: (c.querySelector('.research-cover .img-fallback') as HTMLElement | null)?.style.display === 'flex',
      title: c.querySelector('.research-title')?.textContent,
      desc: c.querySelector('.research-desc')?.textContent,
      btn: c.querySelector('.btn-outline')?.getAttribute('href') ?? null,
    })),
  );
}

/* ========================================================================== */
/* 1. UNIT — supabase-integration.js with a mocked Supabase client and a real DOM */
/* ========================================================================== */
test.describe('Unit — supabase-integration.js (mocked Supabase, real DOM)', () => {
  const profile = {
    id: 'p1',
    hero_title: "hi, i'm Mokhtar Amr",
    job_title: 'WEB DESIGNER\nDIGITAL CREATOR',
    job_title_2: 'WEB DESIGNER & UI/UX CREATOR',
    about_paragraph: 'I design and build stylish web experiences.',
    years_exp_value: '3+',
    years_exp_label: 'Years Experience',
    projects_val_value: '40',
    projects_val_label: 'Projects Completed',
    clients_val_value: '20+',
    clients_val_label: 'Happy Clients',
  };

  test.describe('profile → hero / job titles / stats', () => {
    test('renders greeting, name, roles and statistics', async ({ page }) => {
      const logs = await attachConsole(page);
      await renderWithSupabase(page, { tables: { profile: { rows: [profile] } } });
      const hero = await readHero(page);

      expect(hero.greeting).toBe("Hi, I'm");
      expect(hero.name).toBe('Mokhtar<br>Amr');
      expect(hero.role).toBe('WEB DESIGNER');
      expect(hero.sub).toBe('DIGITAL CREATOR');
      expect(hero.roleLine).toBe('WEB DESIGNER &amp; UI/UX CREATOR');
      expect(hero.desc).toBe('I design and build stylish web experiences.');

      expect(hero.stats[0].num).toBe('3<span>+</span>');
      expect(hero.stats[0].label).toBe('Years<br>Experience');
      expect(hero.stats[1].num).toBe('40');
      expect(hero.stats[1].label).toBe('Projects<br>Completed');
      expect(hero.stats[2].num).toBe('20<span>+</span>');
      expect(hero.stats[2].label).toBe('Happy<br>Clients');

      expect(logs.filter((l) => l.type === 'warning')).toEqual([]);
    });

    test('plain name without a greeting prefix renders fully on the name line', async ({ page }) => {
      await renderWithSupabase(page, {
        tables: { profile: { rows: [{ ...profile, hero_title: 'Some Cool Name' }] } },
      });
      const hero = await readHero(page);
      expect(hero.greeting).toBe('Loading…'); // unchanged (no greeting match)
      expect(hero.name).toBe('Some<br>Cool Name'); // first whitespace run -> <br/>
    });

    test('stats with +/- decoration are escaped and wrapped correctly', async ({ page }) => {
      await renderWithSupabase(page, {
        tables: {
          profile: {
            rows: [{ ...profile, hero_title: null, years_exp_value: '5+', projects_val_value: '100', clients_val_value: '30+' }],
          },
        },
      });
      const hero = await readHero(page);
      expect(hero.stats[0].num).toBe('5<span>+</span>');
      expect(hero.stats[1].num).toBe('100');
      expect(hero.stats[2].num).toBe('30<span>+</span>');
    });
  });

  test.describe('projects grid', () => {
    const projects = [
      {
        id: 'pr1',
        project_number: '01',
        title: 'AquaPure',
        description: 'Water filtration',
        image_url: 'https://cdn.example/a1.jpg',
        image_url_2: 'https://cdn.example/a2.jpg',
        pdf_url: 'https://cdn.example/a.pdf',
        demo_url: '',
      },
      {
        id: 'pr2',
        title: 'Second',
        description: '',
        long_description: 'Long description shown',
        image_url: '',
        image_url_2: 'https://cdn.example/b2.jpg',
        pdf_url: '',
        demo_url: 'https://cdn.example/b.pdf',
      },
      {
        id: 'pr3',
        title: 'NoPhoto',
        description: 'd',
        image_url: null,
        image_url_2: null,
        pdf_url: '',
        demo_url: '',
      },
    ];

    test('renders cards with index, title, description, photos and PDF button', async ({ page }) => {
      await renderWithSupabase(page, { tables: { projects: { rows: projects } } });
      const cards = await readProjects(page);

      expect(cards).toHaveLength(3);

      // Two photos -> NOT "single", correct fallback index, title, desc, PDF link
      expect(cards[0].single).toBe(false);
      expect(cards[0].imgs).toBe(2);
      expect(cards[0].index).toBe('01');
      expect(cards[0].title).toBe('AquaPure');
      expect(cards[0].desc).toBe('Water filtration');
      expect(cards[0].btn).toBe('https://cdn.example/a.pdf');

      // One photo -> "single" layout, index falls back to padded position,
      // description falls back to long_description, demo_url used as link
      expect(cards[1].single).toBe(true);
      expect(cards[1].imgs).toBe(1);
      expect(cards[1].index).toBe('02');
      expect(cards[1].desc).toBe('Long description shown');
      expect(cards[1].btn).toBe('https://cdn.example/b.pdf');

      // No photos -> inline fallback block, no photos container, no button
      expect(cards[2].imgs).toBe(0);
      expect(cards[2].fallbackFlex).toBe(true);
      expect(cards[2].btn).toBeNull();
      expect(cards[2].index).toBe('03');
    });

    test('escapes HTML in project titles when injected into grid innerHTML (XSS)', async ({ page }) => {
      await renderWithSupabase(page, {
        tables: {
          projects: {
            rows: [{ id: 'x1', title: '<img src=x onerror=alert(1)>', description: 'd' }],
          },
        },
      });
      const html = await page.evaluate(() => document.querySelector('.projects-grid')?.innerHTML ?? '');
      expect(html).not.toContain('<img src=x');
      expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    });

    test('failed image loads swap in the inline fallback block (onerror path)', async ({ page }) => {
      await renderWithSupabase(page, {
        images: 'fail',
        tables: {
          projects: {
            rows: [{ id: 'pr1', title: 'Broken Img', description: 'd', image_url: 'https://cdn.example/missing.jpg' }],
          },
        },
      });
      const cards = await readProjects(page);
      expect(cards).toHaveLength(1);
      expect(cards[0].imgs).toBe(1);
      expect(cards[0].fallbackFlex).toBe(true); // img 404 -> onerror reveals the fallback
    });

    test('stale space-named asset paths are normalized to the renamed files (no 404s, no fallbacks)', async ({ page }) => {
      await renderWithSupabase(page, {
        tables: {
          projects: {
            rows: [
              {
                id: 'pr1',
                title: 'AquaPure',
                description: 'd',
                image_url: 'Pojects/Project 1/photo_2026-09-11_20-12-22.jpg',
                image_url_2: 'Pojects/Project 1/photo_2026-09-11_20-12-30.jpg',
                pdf_url: 'Pojects/Project 1/AquaPure_Integrated_Natural_Filtration_and_Desalination_System_1.pdf',
              },
              {
                id: 'pr2',
                title: 'Research',
                description: 'd',
                image_url: 'Research Papers/2/photo_2026-09-11_20-42-00.jpg',
                pdf_url: 'Research Papers/2/Melioidosis research paper.pdf',
              },
            ],
          },
        },
      });
      const results = await page.evaluate(() =>
        Array.from(document.querySelectorAll('.projects-grid .project-card')).map((c) => ({
          srcs: Array.from(c.querySelectorAll('img')).map((i) => i.getAttribute('src')),
          btn: c.querySelector('.btn-solid')?.getAttribute('href') ?? null,
        })),
      );

      expect(results[0].srcs).toEqual([
        'Pojects/Project_1/photo_2026-09-11_20-12-22.jpg',
        'Pojects/Project_1/photo_2026-09-11_20-12-30.jpg',
      ]);
      expect(results[0].btn).toBe('Pojects/Project_1/AquaPure_Integrated_Natural_Filtration_and_Desalination_System_1.pdf');
      expect(results[1].srcs).toEqual(['Research_Papers/2/photo_2026-09-11_20-42-00.jpg']);
      expect(results[1].btn).toBe('Research_Papers/2/Melioidosis_research_paper.pdf');
      // Every rendered URL must match the deployed asset (no spaces, fixed folder names).
      expect(
        results.every((r) => r.srcs.every((s: string) => !/\s/.test(s)) && !/Research Papers/.test(r.btn!) && !/Project [0-9]\//.test(r.srcs.join(' '))),
      ).toBe(true);
    });
  });

  test.describe('certificates grid', () => {
    test('renders sorted cards, fallback numbering and eyebrow count', async ({ page }) => {
      await renderWithSupabase(page, {
        tables: {
          certificates: {
            rows: [
              { id: 'c1', title: 'AWS Cloud', description: 'desc', image_url: '' },
              { id: 'c2', title: '', description: null, image_url: null },
            ],
          },
        },
      });
      const { cards, eyebrow } = await readCerts(page);

      expect(cards).toHaveLength(2);
      expect(cards[0].img).toBe('Certificates/001.jpg');
      expect(cards[0].caption).toBe('AWS Cloud');
      expect(cards[0].title).toBe('AWS Cloud');
      expect(cards[0].desc).toBe('desc');
      expect(cards[1].title).toBe('Certificate 2');
      expect(cards[1].desc).toBeNull();
      expect(eyebrow).toBe('2 & Counting');
    });

    test('escapes certificate captions and titles (XSS)', async ({ page }) => {
      await renderWithSupabase(page, {
        tables: { certificates: { rows: [{ id: 'c1', title: '<script>alert(1)</script>', image_url: '' }] } },
      });
      const html = await page.evaluate(() => document.getElementById('certGrid')?.innerHTML ?? '');
      expect(html).not.toContain('<script>alert(1)</script>');
      expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    });
  });

  test.describe('volunteering grid', () => {
    const volunteer = [
      { id: 'v1', title: 'Workshop', description: 'd1', image_url: 'https://cdn.example/v1.jpg', image_url_2: 'https://cdn.example/v2.jpg' },
      { id: 'v2', title: 'Mentorship', description: '', image_url: 'https://cdn.example/v3.jpg', image_url_2: null },
      { id: 'v3', title: 'No photo', description: '', image_url: null, image_url_2: null },
    ];

    test('renders two-photo, single-photo and no-photo layouts', async ({ page }) => {
      await renderWithSupabase(page, { tables: { volunteering: { rows: volunteer } } });
      const cards = await readVolunteering(page);

      expect(cards).toHaveLength(3);
      expect(cards[0].photosClass).toContain('two');
      expect(cards[0].imgs).toBe(2);
      expect(cards[0].title).toBe('Workshop');
      expect(cards[0].desc).toBe('d1');

      expect(cards[1].photosClass).toContain('single');
      expect(cards[1].imgs).toBe(1);
      expect(cards[1].title).toBe('Mentorship');

      expect(cards[2].photosClass).toBeNull();
      expect(cards[2].imgs).toBe(0);
      expect(cards[2].title).toBe('No photo');
    });

    test('escapes volunteer titles (XSS)', async ({ page }) => {
      await renderWithSupabase(page, {
        tables: { volunteering: { rows: [{ id: 'v1', title: '<b>Bold</b>', image_url: null }] } },
      });
      const html = await page.evaluate(() => document.querySelector('.volunteer-grid')?.innerHTML ?? '');
      expect(html).not.toContain('<b>Bold</b>');
      expect(html).toContain('&lt;b&gt;Bold&lt;/b&gt;');
    });
  });

  test.describe('research grid', () => {
    const research = [
      {
        id: 'r1',
        title: 'Paper 1',
        category: 'ENGINEERING PROJECT',
        description: 'abstract',
        image_url: 'https://cdn.example/cover.jpg',
        pdf_url: 'https://cdn.example/paper.pdf',
      },
      { id: 'r2', title: 'Paper 2', category: null, description: '', image_url: null, pdf_url: null },
    ];

    test('renders cover, category tag, and Read Paper button (or default fallbacks)', async ({ page }) => {
      await renderWithSupabase(page, { tables: { research_papers: { rows: research } } });
      const cards = await readResearch(page);

      expect(cards).toHaveLength(2);
      expect(cards[0].venue).toBe('ENGINEERING PROJECT');
      expect(cards[0].coverImg).toBe(true);
      expect(cards[0].fallbackFlex).toBe(false);
      expect(cards[0].btn).toBe('https://cdn.example/paper.pdf');
      expect(cards[0].title).toBe('Paper 1');
      expect(cards[0].desc).toBe('abstract');

      expect(cards[1].venue).toBe('RESEARCH PAPER'); // category defaults
      expect(cards[1].coverImg).toBe(false);
      expect(cards[1].fallbackFlex).toBe(true);
      expect(cards[1].btn).toBeNull();
      expect(cards[1].desc).toBe('');
    });
  });

  test.describe('error handling & empty data', () => {
    test('empty data sets leave the DOM untouched and raise no errors', async ({ page }) => {
      const logs = await attachConsole(page);
      await renderWithSupabase(page, { tables: {} });
      expect(await readProjects(page)).toEqual([]);
      expect(await readCerts(page)).toEqual({ cards: [], eyebrow: 'Certificates' });
      expect(await readVolunteering(page)).toEqual([]);
      expect(await readResearch(page)).toEqual([]);
      expect(logs.filter((l) => l.type === 'error').length).toBe(0);
    });

    test('a thrown DB error is caught and logged as a warning without breaking rendering', async ({ page }) => {
      const logs = await attachConsole(page);
      await renderWithSupabase(page, {
        tables: {
          profile: { rows: [], throwError: true },
          projects: { rows: [{ id: 'pr1', title: 'T', description: 'd' }] },
        },
      });

      // Profile failed silently; projects still rendered.
      expect(await readProjects(page)).toHaveLength(1);
      expect(logs.some((l) => l.type === 'warning' && l.text.includes('Error loading profile'))).toBe(true);
    });

    test('a returned { error } object skips that section without throwing', async ({ page }) => {
      const logs = await attachConsole(page);
      await renderWithSupabase(page, {
        tables: {
          projects: { rows: [{ id: 'pr1', title: 'T', description: 'd' }], error: { message: 'permission denied' } },
        },
      });
      expect(await readProjects(page)).toEqual([]);
      expect(logs.filter((l) => l.type === 'warning')).toEqual([]); // no throw => no warn
    });

    test('missing supabase global library logs a warning and falls back', async ({ page }) => {
      const logs = await attachConsole(page);
      await renderWithSupabase(page, { includeClient: false });
      expect(logs.some((l) => l.type === 'warning' && l.text.includes('Supabase JS library is not loaded'))).toBe(true);
      expect(await readProjects(page)).toEqual([]);
    });

    test('missing/placeholder config logs a message and falls back', async ({ page }) => {
      const logs = await attachConsole(page);
      await renderWithSupabase(page, { config: {} });
      expect(logs.some((l) => l.type === 'log' && l.text.includes('Config not provided'))).toBe(true);

      await renderWithSupabase(page, {
        config: { url: 'https://YOUR_SUPABASE_PROJECT_ID.supabase.co', anonKey: 'x' },
      });
      expect(await readProjects(page)).toEqual([]);
    });
  });
});

/* ========================================================================== */
/* 2. UNIT — config shape + stack manifest                                     */
/* ========================================================================== */
test.describe('Unit — config & project manifest', () => {
  test('supabase-config.js exposes a URL + publishable key pair', async ({ page }) => {
    await page.setContent('<!DOCTYPE html><html><body></body></html>');
    await page.addScriptTag({ path: CONFIG_SCRIPT });
    const cfg = await page.evaluate(() => (window as any).SUPABASE_CONFIG);
    expect(cfg).toBeTruthy();
    expect(typeof cfg.url).toBe('string');
    expect(cfg.url).toMatch(/^https:\/\/.+\.supabase\.co$/);
    expect(typeof cfg.anonKey).toBe('string');
    expect(cfg.anonKey.length).toBeGreaterThan(0);
  });

  test('root runner and admin-cms declare the expected stack', () => {
    const rootPkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const cmsPkg = JSON.parse(readFileSync(path.join(ROOT, 'admin-cms', 'package.json'), 'utf8'));

    expect(rootPkg.devDependencies['@playwright/test']).toBeTruthy();

    expect(cmsPkg.dependencies.next).toMatch(/^16/);
    expect(cmsPkg.dependencies.react).toBeTruthy();
    expect(cmsPkg.dependencies['@supabase/ssr']).toBeTruthy();
    expect(cmsPkg.dependencies['@supabase/supabase-js']).toBeTruthy();
    expect(cmsPkg.devDependencies.tailwindcss).toBeTruthy();
    expect(cmsPkg.devDependencies.typescript).toBeTruthy();
  });
});

/* ========================================================================== */
/* 3. INTEGRATION — public portfolio site                                       */
/* ========================================================================== */
test.describe('Integration — public portfolio site', () => {
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
        // Skip the lazy lightbox — its src is only set when a user opens an image.
        .filter((img) => img.closest('.lightbox') === null)
        .filter((img) => img.complete && img.naturalWidth === 0)
        .map((img) => img.getAttribute('src') || img.currentSrc),
    );

    expect(brokenImages, `Broken images: ${brokenImages.join(', ') || 'none'}`).toEqual([]);
    expect(failures, `Failed asset requests: ${failures.join('; ') || 'none'}`).toEqual([]);
  });
});

/* ========================================================================== */
/* 4. INTEGRATION — Admin CMS auth guard (proxy.ts) + login                    */
/* ========================================================================== */
test.describe('Integration — Admin CMS (/admin)', () => {
  test('unauthenticated /admin redirects to the login page (proxy auth guard)', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.getByRole('heading', { name: 'Portfolio Admin' })).toBeVisible();

    // Direct hit on a protected admin page (e.g. the dashboard) must be bounced.
    await page.goto(ADMIN_URL, { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.locator('#email')).toBeVisible();
  });

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

  test('login form enforces required fields (email/password are required inputs)', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });

    await expect(page.locator('#email')).toHaveAttribute('required', '');
    await expect(page.locator('#password')).toHaveAttribute('required', '');
  });
});