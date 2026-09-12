'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/types';
import Toast from '@/components/admin/Toast';

export default function ProfilePage() {
  const supabase = createClient();

  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 1. Hero Section Fields
  const [heroTitle, setHeroTitle] = useState("Hi, I'm Mokhtar Amr");
  const [jobTitle, setJobTitle] = useState('WEB DESIGNER\nDIGITAL CREATOR');
  const [jobTitle2, setJobTitle2] = useState('WEB DESIGNER & UI/UX CREATOR');
  const [aboutParagraph, setAboutParagraph] = useState(
    'I design and build stylish, user-focused web experiences that combine creativity with strategy. Passionate about clean design, smooth interactions, and details that make a difference.'
  );

  // 2. Experience & Statistics Fields
  const [yearsExpValue, setYearsExpValue] = useState('3+');
  const [yearsExpLabel, setYearsExpLabel] = useState('Years Experience');
  const [projectsValValue, setProjectsValValue] = useState('40+');
  const [projectsValLabel, setProjectsValLabel] = useState('Projects Completed');
const [clientsValValue, setClientsValValue] = useState('20+');
  const [clientsValLabel, setClientsValLabel] = useState('Happy Clients');

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
const { data, error } = await supabase.from('profile').select('*').limit(1).single();
    if (error) {
      // PGRST116 = no profile row yet; keep defaults instead of surfacing an error
      if (error.code !== 'PGRST116') {
        setToast({ message: error.message || 'Failed to load profile', type: 'error' });
      }
      setLoading(false);
      return;
    }
    if (data) {
      const p = data as Profile;
      setProfileId(p.id);
      if (p.hero_title !== undefined && p.hero_title !== null) setHeroTitle(p.hero_title);
      if (p.job_title !== undefined && p.job_title !== null) setJobTitle(p.job_title);
      if (p.job_title_2 !== undefined && p.job_title_2 !== null) setJobTitle2(p.job_title_2);
      if (p.about_paragraph !== undefined && p.about_paragraph !== null) setAboutParagraph(p.about_paragraph);

      if (p.years_exp_value !== undefined && p.years_exp_value !== null) setYearsExpValue(p.years_exp_value);
      if (p.years_exp_label !== undefined && p.years_exp_label !== null) setYearsExpLabel(p.years_exp_label);
      if (p.projects_val_value !== undefined && p.projects_val_value !== null) setProjectsValValue(p.projects_val_value);
      if (p.projects_val_label !== undefined && p.projects_val_label !== null) setProjectsValLabel(p.projects_val_label);
      if (p.clients_val_value !== undefined && p.clients_val_value !== null) setClientsValValue(p.clients_val_value);
if (p.clients_val_label !== undefined && p.clients_val_label !== null) setClientsValLabel(p.clients_val_label);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  async function handleSave() {
    setSaving(true);
    const payload = {
      hero_title: heroTitle,
      job_title: jobTitle,
      job_title_2: jobTitle2,
      about_paragraph: aboutParagraph,
      years_exp_value: yearsExpValue,
      years_exp_label: yearsExpLabel,
      projects_val_value: projectsValValue,
      projects_val_label: projectsValLabel,
clients_val_value: clientsValValue,
      clients_val_label: clientsValLabel,
    };

    try {
      if (profileId) {
        const { error } = await supabase.from('profile').update(payload).eq('id', profileId);
        if (error) throw new Error(error.message || error.details || 'Update failed');
      } else {
        const result = await supabase.from('profile').insert(payload).select('id').single();
        if (result.error) throw new Error(result.error.message || result.error.details || 'Insert failed');
        if (result.data) setProfileId(result.data.id);
      }
      setToast({ message: 'Profile & Hero content saved successfully!', type: 'success' });
    } catch (err: any) {
      const msg = err?.message || (typeof err === 'string' ? err : 'Save failed');
      setToast({ message: msg, type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <svg className="animate-spin h-8 w-8 text-indigo-400" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Profile & Content</h1>
        <p className="text-gray-400 mt-1">Manage your Hero section, statistics, and dynamic portfolio details.</p>
      </div>

      <div className="space-y-8">
        {/* 1. HERO SECTION */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-red-500 font-bold">✦</span>
            <h2 className="text-base font-semibold text-white">Hero Section</h2>
          </div>

          <div className="space-y-5">
            {/* Hero Title */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Hero Title</label>
              <input
                value={heroTitle}
                onChange={(e) => setHeroTitle(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Hi, I'm Mokhtar Amr"
              />
              <p className="text-xs text-gray-500 mt-1">Controls the greeting and name on the hero area.</p>
            </div>

            {/* Job Title (Top Bar) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Job Title <span className="text-gray-500 text-xs">(Top-Left Corner text)</span>
              </label>
              <textarea
                rows={2}
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono text-xs uppercase"
                placeholder="WEB DESIGNER&#10;DIGITAL CREATOR"
              />
              <p className="text-xs text-gray-500 mt-1">Line 1 is role (red), Line 2 is sub-role (grey).</p>
            </div>

            {/* Job Title 2 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Job Title 2 <span className="text-red-400 text-xs font-semibold">(Large Red Text under Name)</span>
              </label>
              <input
                value={jobTitle2}
                onChange={(e) => setJobTitle2(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-red-400 font-bold placeholder-gray-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 uppercase tracking-wider"
                placeholder="WEB DESIGNER & UI/UX CREATOR"
              />
            </div>

            {/* About Paragraph */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                About Paragraph <span className="text-gray-500 text-xs">(Under Job Title 2)</span>
              </label>
              <textarea
                rows={3}
                value={aboutParagraph}
                onChange={(e) => setAboutParagraph(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
                placeholder="I design and build stylish, user-focused web experiences that combine creativity with strategy..."
              />
            </div>
          </div>
        </section>

        {/* 2. EXPERIENCE & STATISTICS */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-red-500 font-bold">📊</span>
            <h2 className="text-base font-semibold text-white">Experience & Statistics</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Stat 1: Years Experience */}
            <div className="bg-gray-800/60 border border-gray-700/60 p-4 rounded-xl space-y-3">
              <label className="block text-xs font-semibold text-red-400 uppercase tracking-wider">
                1. Years of Experience
              </label>
              <div>
                <span className="text-xs text-gray-400 block mb-1">Value (e.g. 3+)</span>
                <input
                  value={yearsExpValue}
                  onChange={(e) => setYearsExpValue(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-1.5 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="3+"
                />
              </div>
              <div>
                <span className="text-xs text-gray-400 block mb-1">Label</span>
                <input
                  value={yearsExpLabel}
                  onChange={(e) => setYearsExpLabel(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Years Experience"
                />
              </div>
            </div>

            {/* Stat 2: Projects Completed */}
            <div className="bg-gray-800/60 border border-gray-700/60 p-4 rounded-xl space-y-3">
              <label className="block text-xs font-semibold text-red-400 uppercase tracking-wider">
                2. Projects Completed
              </label>
              <div>
                <span className="text-xs text-gray-400 block mb-1">Value (e.g. 40+)</span>
                <input
                  value={projectsValValue}
                  onChange={(e) => setProjectsValValue(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-1.5 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="40+"
                />
              </div>
              <div>
                <span className="text-xs text-gray-400 block mb-1">Label</span>
                <input
                  value={projectsValLabel}
                  onChange={(e) => setProjectsValLabel(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Projects Completed"
                />
              </div>
            </div>

            {/* Stat 3: Happy Clients */}
            <div className="bg-gray-800/60 border border-gray-700/60 p-4 rounded-xl space-y-3">
              <label className="block text-xs font-semibold text-red-400 uppercase tracking-wider">
                3. Happy Clients
              </label>
              <div>
                <span className="text-xs text-gray-400 block mb-1">Value (e.g. 20+)</span>
                <input
                  value={clientsValValue}
                  onChange={(e) => setClientsValValue(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-1.5 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="20+"
                />
              </div>
              <div>
                <span className="text-xs text-gray-400 block mb-1">Label</span>
                <input
                  value={clientsValLabel}
                  onChange={(e) => setClientsValLabel(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Happy Clients"
                />
              </div>
            </div>
          </div>
</section>

        {/* Save Button */}
        <div className="flex justify-end sticky bottom-6 z-10">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-xl transition-colors shadow-xl shadow-red-600/25"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  );
}
