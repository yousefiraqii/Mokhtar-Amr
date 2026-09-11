'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Project, ProjectInsert } from '@/lib/types';
import ImageUpload from '@/components/admin/ImageUpload';
import TagInput from '@/components/admin/TagInput';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import Toast from '@/components/admin/Toast';
import Image from 'next/image';

const EMPTY_FORM: ProjectInsert = {
  title: '',
  description: '',
  long_description: '',
  image_url: '',
  tags: [],
  demo_url: '',
  github_url: '',
  featured: false,
};

export default function ProjectsPage() {
  const supabase = createClient();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectInsert>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    setProjects(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  function openAdd() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowModal(true);
  }

  function openEdit(p: Project) {
    setForm({
      title: p.title,
      description: p.description ?? '',
      long_description: p.long_description ?? '',
      image_url: p.image_url ?? '',
      tags: p.tags ?? [],
      demo_url: p.demo_url ?? '',
      github_url: p.github_url ?? '',
      featured: p.featured,
    });
    setEditingId(p.id);
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('projects').update(form).eq('id', editingId);
        if (error) throw error;
        setToast({ message: 'Project updated!', type: 'success' });
      } else {
        const { error } = await supabase.from('projects').insert(form);
        if (error) throw error;
        setToast({ message: 'Project created!', type: 'success' });
      }
      setShowModal(false);
      fetchProjects();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Save failed', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('projects').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    if (error) {
      setToast({ message: error.message, type: 'error' });
    } else {
      setToast({ message: 'Project deleted.', type: 'success' });
      setDeleteTarget(null);
      fetchProjects();
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Projects</h1>
          <p className="text-gray-400 mt-1">{projects.length} project{projects.length !== 1 ? 's' : ''} total</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Project
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <svg className="animate-spin h-8 w-8 text-indigo-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 text-gray-500">No projects yet. Click &quot;Add Project&quot; to get started.</div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-800">
              <tr className="text-left text-gray-400">
                <th className="px-5 py-3 font-medium">Project</th>
                <th className="px-5 py-3 font-medium">Tags</th>
                <th className="px-5 py-3 font-medium">Featured</th>
                <th className="px-5 py-3 font-medium">Links</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {projects.map((p) => (
                <tr key={p.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {p.image_url && (
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                          <Image src={p.image_url} alt={p.title} fill className="object-cover" unoptimized />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-white">{p.title}</p>
                        {p.description && (
                          <p className="text-gray-500 text-xs truncate max-w-xs">{p.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(p.tags ?? []).slice(0, 3).map((t) => (
                        <span key={t} className="bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded-md">{t}</span>
                      ))}
                      {(p.tags ?? []).length > 3 && (
                        <span className="text-gray-500 text-xs px-1">+{(p.tags ?? []).length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {p.featured ? (
                      <span className="text-emerald-400 text-xs font-medium">✓ Featured</span>
                    ) : (
                      <span className="text-gray-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      {p.demo_url && (
                        <a href={p.demo_url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 text-xs hover:underline">Demo</a>
                      )}
                      {p.github_url && (
                        <a href={p.github_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 text-xs hover:underline">GitHub</a>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(p)} className="text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-gray-700 text-xs">Edit</button>
                      <button onClick={() => setDeleteTarget(p)} className="text-gray-400 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-600/10 text-xs">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowModal(false)} />
          <div className="relative bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">{editingId ? 'Edit Project' : 'Add Project'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-5">
              {/* Image Upload */}
              <ImageUpload
                label="Cover Image"
                folder="projects"
                currentUrl={form.image_url}
                onUploaded={(url) => setForm((f) => ({ ...f, image_url: url }))}
              />

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="My Awesome Project"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Short Description</label>
                <input
                  value={form.description ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Brief one-liner about the project"
                />
              </div>

              {/* Long Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Long Description</label>
                <textarea
                  rows={4}
                  value={form.long_description ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, long_description: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Full project details, technologies used, challenges faced…"
                />
              </div>

              {/* Tags */}
              <TagInput
                label="Tags"
                value={form.tags ?? []}
                onChange={(tags) => setForm((f) => ({ ...f, tags }))}
                placeholder="React, TypeScript, Node.js…"
              />

              {/* URLs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Demo URL</label>
                  <input
                    value={form.demo_url ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, demo_url: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="https://…"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">GitHub URL</label>
                  <input
                    value={form.github_url ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, github_url: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="https://github.com/…"
                  />
                </div>
              </div>

              {/* Featured */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={form.featured}
                    onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
                  />
                  <div className={`w-10 h-6 rounded-full transition-colors ${form.featured ? 'bg-indigo-600' : 'bg-gray-700'}`} />
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.featured ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
                <span className="text-sm font-medium text-gray-300">Featured project</span>
              </label>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-900 border-t border-gray-800 px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving || !form.title.trim()}
                className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition-colors"
              >
                {saving ? 'Saving…' : editingId ? 'Update Project' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Project"
          message={`Are you sure you want to delete "${deleteTarget.title}"? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          isLoading={deleting}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  );
}
