'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Certificate, CertificateInsert } from '@/lib/types';
import ImageUpload from '@/components/admin/ImageUpload';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import Toast from '@/components/admin/Toast';
import Image from 'next/image';

const EMPTY_FORM: CertificateInsert = {
  title: '',
  issuing_organization: '',
  issue_date: '',
  credential_url: '',
  image_url: '',
};

export default function CertificatesPage() {
  const supabase = createClient();

  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CertificateInsert>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Certificate | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchCerts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('certificates')
      .select('*')
      .order('issue_date', { ascending: false });
    setCerts(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchCerts(); }, [fetchCerts]);

  function openAdd() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowModal(true);
  }

  function openEdit(c: Certificate) {
    setForm({
      title: c.title,
      issuing_organization: c.issuing_organization ?? '',
      issue_date: c.issue_date ?? '',
      credential_url: c.credential_url ?? '',
      image_url: c.image_url ?? '',
    });
    setEditingId(c.id);
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('certificates').update(form).eq('id', editingId);
        if (error) throw error;
        setToast({ message: 'Certificate updated!', type: 'success' });
      } else {
        const { error } = await supabase.from('certificates').insert(form);
        if (error) throw error;
        setToast({ message: 'Certificate added!', type: 'success' });
      }
      setShowModal(false);
      fetchCerts();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Save failed', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('certificates').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    if (error) {
      setToast({ message: error.message, type: 'error' });
    } else {
      setToast({ message: 'Certificate deleted.', type: 'success' });
      setDeleteTarget(null);
      fetchCerts();
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Certificates</h1>
          <p className="text-gray-400 mt-1">{certs.length} certificate{certs.length !== 1 ? 's' : ''} total</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Certificate
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <svg className="animate-spin h-8 w-8 text-indigo-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        </div>
      ) : certs.length === 0 ? (
        <div className="text-center py-20 text-gray-500">No certificates yet. Click &quot;Add Certificate&quot; to get started.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {certs.map((c) => (
            <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition-colors">
              {c.image_url && (
                <div className="relative h-40 bg-gray-800">
                  <Image src={c.image_url} alt={c.title} fill className="object-cover" unoptimized />
                </div>
              )}
              <div className="p-4">
                <p className="font-semibold text-white text-sm">{c.title}</p>
                {c.issuing_organization && (
                  <p className="text-gray-400 text-xs mt-1">{c.issuing_organization}</p>
                )}
                {c.issue_date && (
                  <p className="text-gray-500 text-xs mt-0.5">
                    {new Date(c.issue_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
                  </p>
                )}
                <div className="flex gap-2 mt-3">
                  {c.credential_url && (
                    <a href={c.credential_url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 text-xs hover:underline">View credential</a>
                  )}
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-800">
                  <button onClick={() => openEdit(c)} className="text-gray-400 hover:text-white text-xs transition-colors">Edit</button>
                  <button onClick={() => setDeleteTarget(c)} className="text-gray-400 hover:text-red-400 text-xs transition-colors ml-auto">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowModal(false)} />
          <div className="relative bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">{editingId ? 'Edit Certificate' : 'Add Certificate'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-5">
              <ImageUpload
                label="Certificate Image"
                folder="certificates"
                currentUrl={form.image_url}
                onUploaded={(url) => setForm((f) => ({ ...f, image_url: url }))}
              />

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Certificate name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Issuing Organization</label>
                <input
                  value={form.issuing_organization ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, issuing_organization: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Coursera, Google, AWS"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Issue Date</label>
                <input
                  type="date"
                  value={form.issue_date ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, issue_date: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Credential URL</label>
                <input
                  value={form.credential_url ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, credential_url: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://…"
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-900 border-t border-gray-800 px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving || !form.title.trim()}
                className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition-colors"
              >
                {saving ? 'Saving…' : editingId ? 'Update' : 'Add Certificate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Certificate"
          message={`Are you sure you want to delete "${deleteTarget.title}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          isLoading={deleting}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  );
}
