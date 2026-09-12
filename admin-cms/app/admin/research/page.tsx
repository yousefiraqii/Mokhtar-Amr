'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ResearchPaper, ResearchPaperInsert } from '@/lib/types';
import ImageUpload from '@/components/admin/ImageUpload';
import PDFUpload from '@/components/admin/PDFUpload';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import Toast from '@/components/admin/Toast';
import Image from 'next/image';

const EMPTY_FORM: ResearchPaperInsert = {
  title: '',
  category: 'RESEARCH PAPER',
  description: '',
  image_url: '',
  pdf_url: '',
};

export default function ResearchPage() {
  const supabase = createClient();

  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ResearchPaperInsert>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<ResearchPaper | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchPapers = useCallback(async () => {
    setLoading(true);
const { data, error } = await supabase
      .from('research_papers')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      setToast({ message: error.message || 'Failed to load research papers', type: 'error' });
      setPapers([]);
      setLoading(false);
      return;
    }
    setPapers(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchPapers(); }, [fetchPapers]);

  function openAdd() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowModal(true);
  }

  function openEdit(item: ResearchPaper) {
    setForm({
      title: item.title,
      category: item.category ?? 'RESEARCH PAPER',
      description: item.description ?? '',
      image_url: item.image_url ?? '',
      pdf_url: item.pdf_url ?? '',
    });
    setEditingId(item.id);
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('research_papers').update(form).eq('id', editingId);
        if (error) throw new Error(error.message || error.details || 'Update failed');
        setToast({ message: 'Research paper updated!', type: 'success' });
      } else {
        const { error } = await supabase.from('research_papers').insert(form);
        if (error) throw new Error(error.message || error.details || 'Insert failed');
        setToast({ message: 'Research paper added!', type: 'success' });
      }
      setShowModal(false);
      fetchPapers();
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
    const { error } = await supabase.from('research_papers').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    if (error) {
      setToast({ message: error.message, type: 'error' });
    } else {
      setToast({ message: 'Research paper deleted.', type: 'success' });
      setDeleteTarget(null);
      fetchPapers();
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Research Papers</h1>
          <p className="text-gray-400 mt-1">{papers.length} paper{papers.length !== 1 ? 's' : ''} total</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-lg shadow-red-600/20"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Research Paper
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <svg className="animate-spin h-8 w-8 text-red-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        </div>
      ) : papers.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg font-medium text-gray-400">No research papers yet</p>
          <p className="text-sm mt-1">Click &quot;Add Research Paper&quot; to publish your academic and scientific work.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {papers.map((p) => (
            <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-colors flex gap-5">
              {/* Cover Photo */}
              <div className="w-28 flex-shrink-0 aspect-[3/4] relative rounded-xl overflow-hidden border border-gray-800 bg-gray-950">
                {p.image_url ? (
                  <Image src={p.image_url} alt={p.title} fill className="object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 text-xs gap-1">
                    <span className="text-xl">📄</span>
                    <span>No Cover</span>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-bold tracking-wider uppercase text-red-400">
                    {p.category || 'RESEARCH PAPER'}
                  </span>
                  <h3 className="font-bold text-white text-base mt-1 leading-snug">{p.title}</h3>
                  {p.description && (
                    <p className="text-gray-400 text-xs mt-2 line-clamp-3 leading-relaxed">
                      {p.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-800">
                  {p.pdf_url ? (
                    <a
                      href={p.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1"
                    >
                      <span>Read Paper</span>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                    </a>
                  ) : (
                    <span className="text-xs text-gray-600">No PDF attached</span>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(p)}
                      className="text-gray-300 hover:text-white text-xs px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(p)}
                      className="text-red-400 hover:text-red-300 text-xs px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500/20 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gray-900/95 backdrop-blur border-b border-gray-800 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {editingId ? 'Edit Research Paper' : 'Add Research Paper'}
                </h2>
                <p className="text-xs text-gray-400">Add cover photo, category tag, title, and PDF paper</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Cover Photo */}
              <ImageUpload
                label="Cover Photo (1 Cover Photo)"
                folder="research"
                currentUrl={form.image_url}
                onUploaded={(url) => setForm((f) => ({ ...f, image_url: url }))}
              />

              {/* Small Red Title / Category */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Small Title / Category <span className="text-red-400 font-bold">(The Red Heading)</span>
                </label>
                <input
                  value={form.category ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-red-400 font-semibold placeholder-gray-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 uppercase tracking-wider"
                  placeholder="e.g. ENGINEERING PROJECT, RESEARCH PAPER, PUBLISHED WORK"
                />
              </div>

              {/* Title of Project / Paper */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Title of Paper / Project *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="e.g. AquaPure – Integrated Natural Filtration & Desalination System"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
                <textarea
                  rows={4}
                  value={form.description ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none leading-relaxed"
                  placeholder="Research paper abstract, key findings, or methodology summary..."
                />
              </div>

              {/* PDF Document */}
              <PDFUpload
                label="PDF Document (for 'Read Paper' button)"
                folder="research-pdf"
                currentUrl={form.pdf_url}
                onUploaded={(url) => setForm((f) => ({ ...f, pdf_url: url }))}
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
                {saving ? 'Saving…' : editingId ? 'Update Paper' : 'Publish Paper'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Research Paper"
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
