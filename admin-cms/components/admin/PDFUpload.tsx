'use client';

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface PDFUploadProps {
  bucket?: string;
  folder?: string;
  currentUrl?: string | null;
  onUploaded: (url: string) => void;
  label?: string;
}

export default function PDFUpload({
  bucket = 'portfolio',
  folder = 'documents',
  currentUrl,
  onUploaded,
  label = 'PDF Document (View Details Link)',
}: PDFUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState(currentUrl ?? '');
  const [fileName, setFileName] = useState<string | null>(
    currentUrl ? currentUrl.split('/').pop()?.split('?')[0] ?? 'Attached PDF' : null
  );
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);
    setFileName(file.name);

    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop();
      const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      // Try target bucket, fallback to alternative bucket name if needed
      let uploadRes = await supabase.storage
        .from(bucket)
        .upload(filename, file, { upsert: true });

      if (uploadRes.error && bucket !== 'portfolio-assets') {
        uploadRes = await supabase.storage
          .from('portfolio-assets')
          .upload(filename, file, { upsert: true });
        if (!uploadRes.error) bucket = 'portfolio-assets';
      }

      if (uploadRes.error) throw uploadRes.error;

      const { data } = supabase.storage.from(bucket).getPublicUrl(filename);
      setUrlInput(data.publicUrl);
      onUploaded(data.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function handleManualUrlChange(val: string) {
    setUrlInput(val);
    setFileName(val ? val.split('/').pop() ?? 'Document' : null);
    onUploaded(val);
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      
      <div className="space-y-2">
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-700 rounded-xl p-4 cursor-pointer hover:border-indigo-500 transition-colors bg-gray-800/50 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center flex-shrink-0 font-bold text-xs border border-red-500/20">
              PDF
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                {uploading ? 'Uploading PDF…' : fileName || 'Upload PDF file'}
              </p>
              <p className="text-xs text-gray-500">
                {uploading ? 'Please wait...' : 'Click to select .pdf from your computer'}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="px-3 py-1.5 text-xs font-semibold text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            Browse
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 uppercase tracking-wider">or paste URL:</span>
          <input
            type="text"
            value={urlInput}
            onChange={(e) => handleManualUrlChange(e.target.value)}
            placeholder="https://... or path/to/document.pdf"
            className="flex-1 bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {urlInput && (
            <button
              type="button"
              onClick={() => handleManualUrlChange('')}
              className="text-xs text-gray-400 hover:text-red-400 px-2 py-1"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
      <input ref={inputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleFileChange} />
    </div>
  );
}
