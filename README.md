# Mokhtar Amr — Portfolio

Public multi-section portfolio (hero, projects, certificates, volunteering,
research) plus an AI-powered ATS CV generator that targets a job posting.

## Content sources

- Public site (`index.html`, CDN-hosted CSS/JS) and admin CMS (`admin-cms/`)
  read from the same Supabase project (`supabase-config.js` holds the URL +
  anon key, restored from Vercel env vars).
- Run `npm run db:seed` (inside `admin-cms/`) to populate the database from
  the bundled seed. Until then the public site falls back to its static
  inline data and shows placeholders.
- Static image/PDF files stay in the repo folders:

```
images/
├── projects/      project1/ … project6/  (1.jpg, 2.jpg, poster.pdf)
├── certificates/  certificate1/ … certificate36/
├── volunteer/     activity1/ · activity2/
└── research/      paper1-cover.jpg · paper1.pdf …
```

File names must match the DB `source_url` values exactly (the seed defines
them, e.g. `certificate12/1.jpg`) or edit the sync mapping in
`admin-cms/src/lib/ats-ai.ts:wwwUserPreserved` / `certSourceUrl`.

## ATS CV generator

- Every CV row on the public site has a **Generate CV** button that opens a
  modal. Paste a job description, and the CV is rebuilt around it: skills are
  reranked against the posting, the strongest certificates are re-labelled
  with the job's skill language, and projects are re-ordered by keyword
  support. You can switch between a contact-only and full-page layout, then
  **Download PDF** (jsPDF) or print.
- The private app route `?certificate=<id>` deep-links a certificate card
  straight into the lightbox: `<portfolio>/?certificate=<id>`.
- Backend: `POST /api/ats-cv` on the admin app (see `admin-cms/README.md`).
  If the model call fails the client falls back to a basic untargeted preview.

## Tests

```bash
npx playwright test        # unit + integration (public site + admin)
npx playwright test tests/cv.spec.ts   # ATS CV subset
```

`PUBLIC_URL` defaults to the deployed site; the CV specs run against the local
`index.html` so they stay deterministic.

## Local preview

Serve the repo root over HTTP (Open Live Server / `python -m http.server 5500`)
and open the admin app with `npm run dev` in `admin-cms/`. The public site
tries Supabase first and falls back to static data when offline.