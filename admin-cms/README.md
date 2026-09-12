# Mokhtar Amr — Portfolio Admin CMS

Next.js (App Router) admin app that powers the public portfolio data and the
AI-powered ATS CV generator.

## Pages

| Route                 | Purpose                                                            |
| --------------------- | ------------------------------------------------------------------ |
| `/admin`              | Dashboard with data counts and an in-app AI chat assistant        |
| `/admin/login`        | Auth (supabase-auth-helpers, cookie session)                       |
| `/admin/profile`      | Edit profile/job titles/statistics                                 |
| `/admin/projects`     | Edit projects + PDF links                                          |
| `/admin/certificates` | Edit certificates (issuer, date, credential ID, category, skills)  |
| `/admin/research`     | Edit papers                                                       |
| `/admin/volunteering` | Edit volunteer activities                                         |
| `/api/ats-cv`         | POST — generates a job-targeted ATS CV (see below)                 |
| `/api/auth/callback`  | Auth callback                                                      |

## API: ATS CV generator

`POST /api/ats-cv` with JSON `{ "jobDescription": "<job posting text>" }`
returns a CV optimized for that posting. Per request: fetches the Supabase
portfolio data, parses the posting with Gemini (`gemini-3.6-flash`, JSON mode),
reranks skills/certificates/projects against the job, computes ATS match
metrics, then renders an HTML document (served as JSON-safe HTML and also
available as a PDF via the client). If the model call fails the server still
returns a usable CV with `usedModel: "fallback"`.

Auth: disabled in dev; in production requests require the
`X-Auth-Key` header matching `ATS_CV_KEY`.

## Environment variables (`.env.local`)

```bash
NEXT_PUBLIC_SUPABASE_URL=            # public site + admin share these
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=           # server-only (admin pages, ATS CV)
DATABASE_PASSWORD=                   # allowed for local db (psql) scripts
GEMINI_API_KEY=                      # used by /api/ats-cv
ATS_CV_KEY=                          # shared secret for the ATS CV API
NEXT_PUBLIC_SITE_URL=                # public portfolio origin (default localhost:5500)
```

The schema/seed can be pushed to the main Supabase project with:

```bash
npm run db:push    # pushes schema to the main default Supabase project
npm run db:seed    # loads seed data (36 certificates, 6 projects, …)
```

## Commands

```bash
npm run dev        # dev server on http://localhost:3000
npm run build      # production build (with type checking)
npm run start      # serve the production build
npm run gen:types  # regenerate supabase database types
```