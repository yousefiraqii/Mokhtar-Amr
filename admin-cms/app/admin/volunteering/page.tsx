'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { VolunteerActivity, VolunteerActivityInsert } from '@/lib/types';
import ImageUpload from '@/components/admin/ImageUpload';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import Toast from '@/components/admin/Toast';
import Image from 'next/image';

const EMPTY_FORM: VolunteerActivityInsert = {
  title: '',
  description: '',
  image_url: '',
  image_url_2: '',
};

export default function VolunteeringPage() {
  const supabase = createClient();

  const [activities, setActivities] = useState<VolunteerActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<VolunteerActivityInsert>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<VolunteerActivity | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
const { data, error } = await supabase
      .from('volunteering')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      setToast({ message: error.message || 'Failed to load activities', type: 'error' });
      setActivities([]);
      setLoading(false);
      return;
    }
    setActivities(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  function openAdd() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowModal(true);
  }

  function openEdit(item: VolunteerActivity) {
    setForm({
      title: item.title,
      description: item.description ?? '',
      image_url: item.image_url ?? '',
      image_url_2: item.image_url_2 ?? '',
    });
    setEditingId(item.id);
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('volunteering').update(form).eq('id', editingId);
        if (error) throw new Error(error.message || error.details || 'Update failed');
        setToast({ message: 'Volunteering activity updated!', type: 'success' });
      } else {
        const { error } = await supabase.from('volunteering').insert(form);
        if (error) throw new Error(error.message || error.details || 'Insert failed');
        setToast({ message: 'Volunteering activity added!', type: 'success' });
      }
      setShowModal(false);
      fetchActivities();
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
    const { error } = await supabase.from('volunteering').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    if (error) {
      setToast({ message: error.message, type: 'error' });
    } else {
      setToast({ message: 'Volunteering activity deleted.', type: 'success' });
      setDeleteTarget(null);
      fetchActivities();
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Volunteering</h1>
          <p className="text-gray-400 mt-1">{activities.length} activit{activities.length !== 1 ? 'ies' : 'y'} total</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Activity
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
      ) : activities.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg font-medium text-gray-400">No volunteering activities yet</p>
          <p className="text-sm mt-1">Click &quot;Add Activity&quot; to add your volunteering initiatives and photos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activities.map((item) => (
            <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-colors flex flex-col justify-between">
              <div>
                {/* Photos */}
                <div className="flex gap-3 mb-4">
                  {item.image_url && (
                    <div className="relative flex-1 h-44 rounded-xl overflow-hidden border border-gray-800 bg-gray-950">
                      <Image src={item.image_url} alt={item.title} fill className="object-cover" unoptimized />
                    </div>
                  )}
                  {item.image_url_2 && (
                    <div className="relative flex-1 h-44 rounded-xl overflow-hidden border border-gray-800 bg-gray-950">
                      <Image src={item.image_url_2} alt={`${item.title} photo 2`} fill className="object-cover" unoptimized />
                    </div>
                  )}
                </div>

                <h3 className="font-bold text-white text-base">{item.title}</h3>
                {item.description && (
                  <p className="text-gray-400 text-xs mt-2 leading-relaxed whitespace-pre-line">
                    {item.description}
                  </p>
                )}
              </div>

              <div className="flex gap-2 mt-5 pt-4 border-t border-gray-800">
                <button
                  onClick={() => openEdit(item)}
                  className="text-gray-400 hover:text-white text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeleteTarget(item)}
                  className="text-red-400 hover:text-red-300 text-xs px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors ml-auto"
                >
                  Delete
                </button>
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
                  {editingId ? 'Edit Volunteering Activity' : 'Add Volunteering Activity'}
                </h2>
                <p className="text-xs text-gray-400">Add details and photos for this activity</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Photos */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Photos (1 or 2 Photos)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ImageUpload
                    label="Photo 1"
                    folder="volunteering"
                    currentUrl={form.image_url}
                    onUploaded={(url) => setForm((f) => ({ ...f, image_url: url }))}
                  />
                  <ImageUpload
                    label="Photo 2 (Optional)"
                    folder="volunteering"
                    currentUrl={form.image_url_2}
                    onUploaded={(url) => setForm((f) => ({ ...f, image_url_2: url }))}
                  />
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Community Web Design Workshop"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
                <textarea
                  rows={4}
                  value={form.description ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
                  placeholder="Describe your volunteering role, achievements, and impact..."
                />
              </div>
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
                className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition-colors shadow-lg shadow-indigo-600/20"
              >
                {saving ? 'Saving…' : editingId ? 'Update Activity' : 'Create Activity'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Volunteering Activity"
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
