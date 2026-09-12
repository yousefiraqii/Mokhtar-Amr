'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Project, ProjectInsert } from '@/lib/types';
import ImageUpload from '@/components/admin/ImageUpload';
import PDFUpload from '@/components/admin/PDFUpload';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import Toast from '@/components/admin/Toast';
import Image from 'next/image';

const EMPTY_FORM: ProjectInsert = {
  project_number: '',
  title: '',
  description: '',
  image_url: '',
  image_url_2: '',
  pdf_url: '',
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
const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      setToast({ message: error.message || 'Failed to load projects', type: 'error' });
      setProjects([]);
      setLoading(false);
      return;
    }
    setProjects(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  function openAdd() {
    const nextNumber = String(projects.length + 1).padStart(2, '0');
    setForm({ ...EMPTY_FORM, project_number: nextNumber });
    setEditingId(null);
    setShowModal(true);
  }

  function openEdit(p: Project) {
    setForm({
      project_number: p.project_number ?? '',
      title: p.title,
      description: p.description ?? '',
      image_url: p.image_url ?? '',
      image_url_2: p.image_url_2 ?? '',
      pdf_url: p.pdf_url ?? p.demo_url ?? '',
      demo_url: p.demo_url ?? '',
      github_url: p.github_url ?? '',
      featured: p.featured ?? false,
    });
    setEditingId(p.id);
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        // Sync demo_url with pdf_url for backward compatibility
        demo_url: form.pdf_url || form.demo_url,
      };

      if (editingId) {
        const { error } = await supabase.from('projects').update(payload).eq('id', editingId);
        if (error) throw new Error(error.message || error.details || 'Update failed');
        setToast({ message: 'Project updated!', type: 'success' });
      } else {
        const { error } = await supabase.from('projects').insert(payload);
        if (error) throw new Error(error.message || error.details || 'Insert failed');
        setToast({ message: 'Project created!', type: 'success' });
      }
      setShowModal(false);
      fetchProjects();
    } catch (err: any) {
      const msg = err?.message || (typeof err === 'string' ? err : 'Save failed');
      setToast({ message: msg, type: 'error' });
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
          className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-lg shadow-red-600/20"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Project
        </button>
      </div>

      {/* List / Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <svg className="animate-spin h-8 w-8 text-red-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg font-medium text-gray-400">No projects yet</p>
          <p className="text-sm mt-1">Click &quot;Add Project&quot; to add your first project with photos, number, description, and PDF details.</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-800 bg-gray-950/40">
              <tr className="text-left text-gray-400">
                <th className="px-5 py-3 font-medium w-16">No.</th>
                <th className="px-5 py-3 font-medium">Photos</th>
                <th className="px-5 py-3 font-medium">Title & Description</th>
                <th className="px-5 py-3 font-medium">PDF Details</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {projects.map((p, idx) => {
                const num = p.project_number || String(idx + 1).padStart(2, '0');
                const pdf = p.pdf_url || p.demo_url;
                return (
                  <tr key={p.id} className="hover:bg-gray-800/40 transition-colors">
                    {/* Number */}
                    <td className="px-5 py-4 font-mono font-bold text-red-500 text-base">
                      {num}
                    </td>

                    {/* Photos Preview */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {p.image_url ? (
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-700 bg-gray-800 flex-shrink-0">
                            <Image src={p.image_url} alt={p.title} fill className="object-cover" unoptimized />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg border border-dashed border-gray-700 flex items-center justify-center text-xs text-gray-600">
                            1
                          </div>
                        )}
                        {p.image_url_2 ? (
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-700 bg-gray-800 flex-shrink-0">
                            <Image src={p.image_url_2} alt={`${p.title} photo 2`} fill className="object-cover" unoptimized />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg border border-dashed border-gray-700 flex items-center justify-center text-xs text-gray-600">
                            2
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Title & Desc */}
                    <td className="px-5 py-4 max-w-md">
                      <p className="font-semibold text-white text-sm">{p.title}</p>
                      {p.description && (
                        <p className="text-gray-400 text-xs mt-1 line-clamp-2 leading-relaxed">
                          {p.description}
                        </p>
                      )}
                    </td>

                    {/* PDF Details Link */}
                    <td className="px-5 py-4">
                      {pdf ? (
                        <a
                          href={pdf}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 bg-red-600/10 border border-red-500/30 text-red-400 hover:text-red-300 hover:border-red-500 text-xs px-2.5 py-1 rounded-md transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                          View PDF
                        </a>
                      ) : (
                        <span className="text-gray-600 text-xs">No PDF</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(p)}
                          className="text-gray-300 hover:text-white px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-xs transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(p)}
                          className="text-red-400 hover:text-red-300 px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-xs transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gray-900/95 backdrop-blur border-b border-gray-800 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {editingId ? 'Edit Project' : 'Add Project'}
                </h2>
                <p className="text-xs text-gray-400">Fill in the project details for your portfolio card</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Form Body */}
            <div className="p-6 space-y-5">
              {/* 1. Two Photos (Side by Side) */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Project Photos (2 Photos)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ImageUpload
                    label="Photo 1 (Cover)"
                    folder="projects"
                    currentUrl={form.image_url}
                    onUploaded={(url) => setForm((f) => ({ ...f, image_url: url }))}
                  />
                  <ImageUpload
                    label="Photo 2 (Second Photo)"
                    folder="projects"
                    currentUrl={form.image_url_2}
                    onUploaded={(url) => setForm((f) => ({ ...f, image_url_2: url }))}
                  />
                </div>
              </div>

              {/* 2. Number & Title */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Number</label>
                  <input
                    value={form.project_number ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, project_number: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 font-mono font-bold text-center"
                    placeholder="01"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Title *</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="e.g. AquaPure – Low-Cost Multi-Stage Water Filtration System"
                  />
                </div>
              </div>

              {/* 3. Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Description *</label>
                <textarea
                  rows={4}
                  value={form.description ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none leading-relaxed"
                  placeholder="Explain your project, key features, innovation, or prototype details..."
                />
              </div>

              {/* 4. PDF Document (View Details Button) */}
              <PDFUpload
                label="PDF Document (for 'View Details' button)"
                folder="projects-pdf"
                currentUrl={form.pdf_url || form.demo_url}
                onUploaded={(url) => setForm((f) => ({ ...f, pdf_url: url, demo_url: url }))}
              />
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-900/95 backdrop-blur border-t border-gray-800 px-6 py-4 flex justify-end gap-3 z-10">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !form.title.trim()}
                className="px-5 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg transition-colors shadow-lg shadow-red-600/20"
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
