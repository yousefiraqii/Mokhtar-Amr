import { createClient } from '@/lib/supabase/server';
import { generateAtsCv, computeAtsMetrics, AtsCvError, type PortfolioDataset } from '@/lib/ats-ai';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_JOB_DESC = 8000;

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const jobDescription =
      typeof body?.jobDescription === 'string' ? body.jobDescription.slice(0, MAX_JOB_DESC) : undefined;

    const supabase = await createClient();
    const dataset = await buildDataset();

    const portfolioUrl = process.env.PORTFOLIO_URL || 'https://mokhtar-amr.vercel.app';

    const { cv, usedModel } = await generateAtsCv(dataset, {
      jobDescription,
      portfolioUrl,
    });
    const ats = computeAtsMetrics(dataset, cv, jobDescription);

    return json(
      {
        cv,
        ats,
        usedModel,
        counts: {
          projects: dataset.projects.length,
          certificates: dataset.certificates.length,
          volunteering: dataset.volunteering.length,
          research: dataset.research.length,
        },
      },
      200
    );
  } catch (err) {
    if (err instanceof AtsCvError) {
      if (err.code === 'NO_KEY') {
        return json(
          { error: { code: 'NO_KEY', message: 'AI key is not configured on the server.' }, fallback: true },
          503
        );
      }
      return json({ error: { code: err.code, message: err.message } }, 502);
    }
    console.error('[ats-cv] Unhandled error:', err);
    return json({ error: { code: 'INTERNAL', message: 'CV generation failed.' } }, 500);
  }
}

async function buildDataset(): Promise<PortfolioDataset> {
  const supabase = await createClient();

  let profile: PortfolioDataset['profile'] = null;
  try {
    const { data, error } = await supabase.from('profile').select('*').limit(1).single();
    if (error && error.code !== 'PGRST116') {
      throw new AtsCvError('Failed to load profile.', 'DB_ERROR');
    }
    profile = data ?? null;
  } catch (err) {
    if (err instanceof AtsCvError) throw err;
  }

  const projectsRes = await supabase.from('projects').select('*').order('created_at', { ascending: false });
  const certsRes = await supabase
    .from('certificates')
    .select('*')
    .order('created_at', { ascending: true })
    .order('title', { ascending: true });
  const volRes = await supabase.from('volunteering').select('*').order('created_at', { ascending: false });
  const researchRes = await supabase
    .from('research_papers')
    .select('*')
    .order('created_at', { ascending: false });

  return {
    profile,
    projects: (projectsRes.data ?? []).map((p: any) => ({
      id: p.id,
      title: p.title,
      description: p.description ?? p.long_description,
      long_description: p.long_description,
      project_number: p.project_number,
      pdf_url: p.pdf_url,
      demo_url: p.demo_url,
      github_url: p.github_url,
      tags: p.tags ?? [],
    })),
    certificates: (certsRes.data ?? []).map((c: any) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      issuer: c.issuer,
      issue_date: c.issue_date,
      credential_id: c.credential_id,
      category: c.category,
      achievement: c.achievement,
      skills: c.skills ?? [],
    })),
    volunteering: (volRes.data ?? []).map((v: any) => ({
      id: v.id,
      title: v.title,
      description: v.description,
    })),
    research: (researchRes.data ?? []).map((r: any) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      description: r.description,
      pdf_url: r.pdf_url,
    })),
  };
}

function json(payload: unknown, status: number) {
  return NextResponse.json(payload, { status, headers: corsHeaders() });
}