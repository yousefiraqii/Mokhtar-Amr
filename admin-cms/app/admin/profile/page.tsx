'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile, SocialLinks } from '@/lib/types';
import TagInput from '@/components/admin/TagInput';
import Toast from '@/components/admin/Toast';

const SOCIAL_FIELDS: { key: keyof SocialLinks; label: string; placeholder: string }[] = [
  { key: 'github', label: 'GitHub', placeholder: 'https://github.com/username' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/username' },
  { key: 'twitter', label: 'Twitter / X', placeholder: 'https://twitter.com/username' },
  { key: 'email', label: 'Email', placeholder: 'hello@example.com' },
];

export default function ProfilePage() {
  const supabase = createClient();

  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [heroTitle, setHeroTitle] = useState('');
  const [bio, setBio] = useState('');
  const [aboutMe, setAboutMe] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('profile').select('*').limit(1).single();
    if (data) {
      const p = data as Profile;
      setProfileId(p.id);
      setHeroTitle(p.hero_title ?? '');
      setBio(p.bio ?? '');
      setAboutMe(p.about_me ?? '');
      setSkills(p.skills ?? []);
      setSocialLinks(p.social_links ?? {});
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  async function handleSave() {
    setSaving(true);
    const payload = {
      hero_title: heroTitle,
      bio,
      about_me: aboutMe,
      skills,
      social_links: socialLinks,
    };

    try {
      let error;
      if (profileId) {
        ({ error } = await supabase.from('profile').update(payload).eq('id', profileId));
      } else {
        const result = await supabase.from('profile').insert(payload).select('id').single();
        error = result.error;
        if (result.data) setProfileId(result.data.id);
      }
      if (error) throw error;
      setToast({ message: 'Profile saved!', type: 'success' });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Save failed', type: 'error' });
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
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Profile & Content</h1>
        <p className="text-gray-400 mt-1">Edit your portfolio&apos;s dynamic site content.</p>
      </div>

      <div className="space-y-8">
        {/* Hero */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-white mb-5">Hero Section</h2>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Hero Title</label>
            <input
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Hi, I'm Mokhtar Amr"
            />
          </div>
        </section>

        {/* Bio & About */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-white mb-5">Bio & About</h2>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Bio (short)</label>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="Short tagline or role description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">About Me</label>
              <textarea
                rows={6}
                value={aboutMe}
                onChange={(e) => setAboutMe(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="Tell your story — background, passions, what you're working on…"
              />
            </div>
          </div>
        </section>

        {/* Skills */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-white mb-5">Skills</h2>
          <TagInput
            value={skills}
            onChange={setSkills}
            label="Skills (press Enter or comma to add)"
            placeholder="React, Python, Figma…"
          />
        </section>

        {/* Social Links */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-white mb-5">Social Links</h2>
          <div className="space-y-4">
            {SOCIAL_FIELDS.map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
                <input
                  value={socialLinks[key] ?? ''}
                  onChange={(e) =>
                    setSocialLinks((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={placeholder}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Save */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition-colors"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  );
}
