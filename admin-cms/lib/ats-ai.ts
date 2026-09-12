// ATS CV generation engine.
// Server-side only: talks to Google Gemini with the API key held in
// process.env.AI_API_KEY. Never import this from a client component.

export interface PortfolioDataset {
  profile: {
    hero_title?: string | null;
    job_title_2?: string | null;
    about_paragraph?: string | null;
    years_exp_value?: string | null;
    years_exp_label?: string | null;
    projects_val_value?: string | null;
    projects_val_label?: string | null;
    clients_val_value?: string | null;
    clients_val_label?: string | null;
  } | null;
  projects: Array<{
    id: string;
    title: string;
    description?: string | null;
    long_description?: string | null;
    project_number?: string | null;
    pdf_url?: string | null;
    demo_url?: string | null;
    github_url?: string | null;
    tags?: string[] | null;
  }>;
  certificates: Array<{
    id: string;
    title: string;
    description?: string | null;
    issuer?: string | null;
    issue_date?: string | null;
    credential_id?: string | null;
    category?: string | null;
    achievement?: string | null;
    skills?: string[] | null;
    sourceUrl?: string;
  }>;
  volunteering: Array<{
    id: string;
    title: string;
    description?: string | null;
  }>;
  research: Array<{
    id: string;
    title: string;
    category?: string | null;
    description?: string | null;
    pdf_url?: string | null;
  }>;
}

export interface AtsCvJson {
  profile: {
    name: string;
    professionalName?: string;
    title: string;
    location?: string;
    email?: string;
    phone?: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
  };
  summary: string;
  education: Array<{
    institution: string;
    degree: string;
    graduationYear?: string;
    coursework?: string[];
    achievements?: string[];
  }>;
  experience: Array<{
    organization: string;
    position: string;
    startDate?: string;
    endDate?: string;
    bullets: string[];
    skills?: string[];
  }>;
  projects: Array<{
    name: string;
    role?: string;
    technologies?: string[];
    bullets: string[];
    links?: string[];
    award?: string;
  }>;
  achievements: Array<{
    title: string;
    description?: string;
    date?: string;
    organization?: string;
  }>;
  certifications: Array<{
    title: string;
    issuer?: string;
    date?: string;
    credentialId?: string;
    category?: string;
    achievement?: string;
    skills?: string[];
    sourceUrl: string;
  }>;
  skills: {
    technical: string[];
    research: string[];
    soft: string[];
    tools: string[];
  };
  languages: string[];
  publications: Array<{
    title: string;
    venue?: string;
    link?: string;
  }>;
  links: string[];
  ats: {
    keywords: string[];
    score: number;
    keywordMatch?: number;
    missingKeywords: string[];
    strongMatches: string[];
    weakSections: string[];
    formattingIssues: string[];
    recommendations: string[];
  };
}

const GEMINI_BASE = 'https://generativelanguage.googleapis.com';

function geminiModel(): string {
  return process.env.AI_MODEL || 'gemini-3.6-flash';
}

const SYSTEM_PROMPT = `You are an expert ATS resume engineer. You convert a structured portfolio dataset into a professional, ATS-compatible CV represented as strict JSON.

HARD RULES — TRUTH & HALLUCINATION PROTECTION:
1. ONLY use facts present in the "portfolio" object. NEVER invent organizations, dates, awards, titles, responsibilities, skills, grades, URLs, or statistics.
2. If information is uncertain or missing, OMIT it (empty string / empty array). Do not guess.
3. You may "understand" what a certificate represents (skills, domain) but every derived skill must be reasonably supported by the certificate title/description/fields or the portfolio.
4. Do NOT claim a skill the portfolio does not support, even if the job description requests it.
5. Normalize equivalent terms (e.g. "Artificial Intelligence" and "AI") without keyword stuffing.
6. Convert project/activity descriptions into concise ATS bullets shaped: Action + Task + Technology/Method + Result. Keep them faithful to the source text.
7. Only include sections with meaningful content. Empty collections must be empty arrays, never omitted keys.

OUTPUT FORMAT — return ONLY valid JSON matching EXACTLY this schema (no markdown fences, no commentary):
{
 "profile": { "name": string, "professionalName": string, "title": string, "location": string, "email": string, "phone": string, "linkedin": string, "github": string, "portfolio": string },
 "summary": string,
 "education": [ { "institution": string, "degree": string, "graduationYear": string, "coursework": [string], "achievements": [string] } ],
 "experience": [ { "organization": string, "position": string, "startDate": string, "endDate": string, "bullets": [string], "skills": [string] } ],
 "projects": [ { "name": string, "role": string, "technologies": [string], "bullets": [string], "links": [string], "award": string } ],
 "achievements": [ { "title": string, "description": string, "date": string, "organization": string } ],
 "certifications": [ { "title": string, "issuer": string, "date": string, "credentialId": string, "category": string, "achievement": string, "skills": [string], "sourceUrl": string } ],
 "skills": { "technical": [string], "research": [string], "soft": [string], "tools": [string] },
 "languages": [string],
 "publications": [ { "title": string, "venue": string, "link": string } ],
 "links": [string],
 "ats": { "keywords": [string], "score": number, "keywordMatch": number, "missingKeywords": [string], "strongMatches": [string], "weakSections": [string], "formattingIssues": [string], "recommendations": [string] }
}

GUIDANCE:
- profile.name: extract from portfolio profile.hero_title (it contains the person's name); leave empty if not derivable.
- profile.title: use profile.job_title_2.
- summary: 3-5 lines, based ONLY on strongest evidence; identify identity, technical areas, strongest projects, achievements, direction.
- certifications: one entry per certificate. For each, copy sourceUrl EXACTLY as provided. Use issuer/issue_date/category/achievement/skills when present; derive a short skills list only when clearly supported.
- certifications sourceUrl is fixed and authoritative — never alter or invent it.
- projects: max 1-2 bullets each, ATS bullet style; include technologies from tags when present.
- volunteering: map to "experience" bullets (organization absent => use "Volunteering" or the activity itself) OR keep in achievements if more natural. Prefer experience when the item shows sustained activity.
- ats: provide keywords, a realistic score 0-100, strongMatches, weakSections, formattingIssues, recommendations. If a "job_description" is provided, target the CV toward it, but NEVER fabricate matching skills.`;

export interface GenerateAtsOptions {
  jobDescription?: string;
  portfolioUrl: string;
}

export async function generateAtsCv(
  dataset: PortfolioDataset,
  options: GenerateAtsOptions
): Promise<{ cv: AtsCvJson; usedModel: string }> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    throw new AtsCvError('AI_API_KEY is not configured.', 'NO_KEY');
  }

  const certificateUrlMap = new Map(
    dataset.certificates.map((c) => [
      c.id,
      `${options.portfolioUrl.replace(/\/$/, '')}/?certificate=${encodeURIComponent(c.id)}`,
    ])
  );

  const certificatesForAi = dataset.certificates.map((c) => ({
    ...c,
    sourceUrl: certificateUrlMap.get(c.id) || '',
  }));

  const userPayload = {
    portfolio: { ...dataset, certificates: certificatesForAi },
    ...(options.jobDescription ? { job_description: options.jobDescription } : {}),
  };

  const model = geminiModel();
  const raw = await callGemini(apiKey, model, SYSTEM_PROMPT, JSON.stringify(userPayload));
  const parsed = parseJsonRecovered(raw);
  const cv = normalizeAtsCv(parsed, options.portfolioUrl);

  return { cv, usedModel: model };
}

async function callGemini(apiKey: string, model: string, system: string, userText: string): Promise<string> {
  const url = `${GEMINI_BASE}/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: userText }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.error?.message || `Gemini API error (HTTP ${res.status})`;
    throw new AtsCvError(msg, String(res.status));
  }

  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .map((p: { text?: string }) => p.text ?? '')
    .join('\n')
    .trim();
  if (!text) {
    throw new AtsCvError('Empty response from Gemini.', 'EMPTY');
  }
  return text;
}

/** Recover JSON from model output: strip code fences, trim, tolerate trailing commas. */
export function parseJsonRecovered(text: string): unknown {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start !== -1 && end > start) t = t.slice(start, end + 1);

  try {
    return JSON.parse(t);
  } catch {
    // tolerate trailing commas
    const cleaned = t
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"');
    return JSON.parse(cleaned);
  }
}

/** Coerce the parsed object into a safe, complete AtsCvJson. */
export function normalizeAtsCv(parsed: unknown, portfolioUrl: string): AtsCvJson {
  const obj = (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, any>;
  const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
  const strArr = (v: unknown): string[] =>
    Array.isArray(v) ? v.map(str).filter(Boolean) : [];
  const mapString = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? x : str(x))) : [];

  const certificationsRaw = Array.isArray(obj.certifications) ? obj.certifications : [];
  const certifications = certificationsRaw.map((c: any) => {
    const rawUrl = str(c.sourceUrl);
    const url =
      /^https?:\/\//i.test(rawUrl) && rawUrl.includes('certificate=')
        ? rawUrl
        : `${portfolioUrl.replace(/\/$/, '')}/#certificates`;
    return {
      title: str(c.title) || 'Certificate',
      issuer: str(c.issuer),
      date: str(c.date),
      credentialId: str(c.credentialId),
      category: str(c.category),
      achievement: str(c.achievement),
      skills: mapString(c.skills),
      sourceUrl: url,
    };
  });

  const skills = obj.skills && typeof obj.skills === 'object' ? obj.skills : {};
  const ats = obj.ats && typeof obj.ats === 'object' ? obj.ats : {};

  return {
    profile: {
      name: str(obj.profile?.name),
      professionalName: str(obj.profile?.professionalName),
      title: str(obj.profile?.title),
      location: str(obj.profile?.location),
      email: str(obj.profile?.email),
      phone: str(obj.profile?.phone),
      linkedin: str(obj.profile?.linkedin),
      github: str(obj.profile?.github),
      portfolio: str(obj.profile?.portfolio) || portfolioUrl,
    },
    summary: str(obj.summary),
    education: Array.isArray(obj.education)
      ? obj.education.map((e: any) => ({
          institution: str(e.institution),
          degree: str(e.degree),
          graduationYear: str(e.graduationYear),
          coursework: strArr(e.coursework),
          achievements: strArr(e.achievements),
        }))
      : [],
    experience: Array.isArray(obj.experience)
      ? obj.experience.map((e: any) => ({
          organization: str(e.organization),
          position: str(e.position),
          startDate: str(e.startDate),
          endDate: str(e.endDate),
          bullets: strArr(e.bullets),
          skills: mapString(e.skills),
        }))
      : [],
    projects: Array.isArray(obj.projects)
      ? obj.projects.map((p: any) => ({
          name: str(p.name),
          role: str(p.role),
          technologies: mapString(p.technologies),
          bullets: strArr(p.bullets),
          links: strArr(p.links),
          award: str(p.award),
        }))
      : [],
    achievements: Array.isArray(obj.achievements)
      ? obj.achievements.map((a: any) => ({
          title: str(a.title),
          description: str(a.description),
          date: str(a.date),
          organization: str(a.organization),
        }))
      : [],
    certifications,
    skills: {
      technical: mapString(skills.technical),
      research: mapString(skills.research),
      soft: mapString(skills.soft),
      tools: mapString(skills.tools),
    },
    languages: mapString(obj.languages),
    publications: Array.isArray(obj.publications)
      ? obj.publications.map((p: any) => ({
          title: str(p.title),
          venue: str(p.venue),
          link: str(p.link),
        }))
      : [],
    links: mapString(obj.links),
    ats: {
      keywords: mapString(ats.keywords),
      score: clampScore(Number(ats.score) || 0),
      keywordMatch: Number(ats.keywordMatch) || 0,
      missingKeywords: mapString(ats.missingKeywords),
      strongMatches: mapString(ats.strongMatches),
      weakSections: mapString(ats.weakSections),
      formattingIssues: mapString(ats.formattingIssues),
      recommendations: mapString(ats.recommendations),
    },
  };
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export class AtsCvError extends Error {
  code: string;
  constructor(message: string, code = 'AI_ERROR') {
    super(message);
    this.name = 'AtsCvError';
    this.code = code;
  }
}

/** Deterministic ATS diagnostics computed from the local data (not the model). */
export function computeAtsMetrics(
  dataset: PortfolioDataset,
  cv: AtsCvJson,
  jobDescription?: string
) {
  const portfolioText = [
    dataset.profile?.about_paragraph,
    dataset.profile?.job_title_2,
    ...dataset.projects.map((p) => [p.title, p.description, p.long_description, ...(p.tags ?? [])].join(' ')),
    ...dataset.certificates.map((c) =>
      [c.title, c.description, c.issuer, c.category, c.achievement, ...(c.skills ?? [])].join(' ')
    ),
    ...dataset.volunteering.map((v) => [v.title, v.description].join(' ')),
    ...dataset.research.map((r) => [r.title, r.description, r.category].join(' ')),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  let keywordMatch: number | undefined;
  let missingKeywords: string[] = [];
  let strongMatches: string[] = [];

  if (jobDescription) {
    const tokens = tokenize(jobDescription);
    const matched = tokens.filter((t) => portfolioText.includes(t));
    missingKeywords = tokens.filter((t) => !portfolioText.includes(t)).slice(0, 12);
    strongMatches = dedupe(matched).slice(0, 12);
    keywordMatch = tokens.length ? Math.round((matched.length / tokens.length) * 100) : 0;
  } else {
    strongMatches = dedupe(cv.ats.strongMatches).slice(0, 12);
    missingKeywords = dedupe(cv.ats.missingKeywords).slice(0, 12);
  }

  let score = 70;
  if (cv.profile.name) score += 4;
  if (cv.summary) score += 4;
  if (cv.education.length) score += 4;
  if (cv.experience.length) score += 4;
  if (cv.projects.length) score += 4;
  if (cv.certifications.length) score += 4;
  if (Object.values(cv.skills).some((s) => s.length)) score += 3;
  if (typeof keywordMatch === 'number') score = Math.round(score * 0.7 + keywordMatch * 0.3);
  score = clampScore(score);

  const recommendations: string[] = [];
  if (!cv.summary) recommendations.push('Add a professional summary.');
  if (!cv.education.length) recommendations.push('No education record exists in the portfolio.');
  if (!cv.experience.length && cv.achievements.length > 3)
    recommendations.push('Consider listing sustained activities under Experience.');
  if (!cv.certifications.length) recommendations.push('No certificates are stored — add certificates in the Admin CMS.');
  if (missingKeywords.length)
    recommendations.push(
      `Job-specific keywords not supported by the portfolio: ${missingKeywords.join(', ')}.`
    );
  if (recommendations.length === 0) recommendations.push('Document is ATS-ready.');

  return {
    score: clampScore(score),
    keywordMatch: keywordMatch,
    strongMatches,
    missingKeywords,
    weakSections: dedupe(cv.ats.weakSections).slice(0, 6),
    formattingIssues: dedupe(cv.ats.formattingIssues).slice(0, 6),
    recommendations: recommendations.slice(0, 6),
  };
}

const STOPWORDS = new Set(
  'the a an and or but for of to in on at by with from as is are was were be been being this that these those it its they them he she we you your our work role year new'
    .split(/\s+/)
);

function tokenize(text: string): string[] {
  return dedupe(
    text
      .toLowerCase()
      .replace(/[^a-z0-9+#.-]+/g, ' ')
      .split(/\s+/)
      .map((t) => t.trim().replace(/[.,;:!?]+$/, ''))
      .filter((t) => t.length > 1 && !STOPWORDS.has(t))
  );
}

function dedupe(arr: string[]): string[] {
  return Array.from(new Set(arr));
}