'use client';

import { useRef, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

interface ImageUploadProps {
  bucket?: string;
  folder?: string;
  currentUrl?: string | null;
  onUploaded: (url: string) => void;
  label?: string;
}

export default function ImageUpload({
  bucket = 'portfolio',
  folder = 'uploads',
  currentUrl,
  onUploaded,
  label = 'Image',
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPreview(currentUrl ?? null);
  }, [currentUrl]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Local preview
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setError(null);
    setUploading(true);

    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop();
      const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

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
      setPreview(data.publicUrl);
      onUploaded(data.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setPreview(currentUrl ?? null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-300">{label}</label>
        {preview && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPreview(null);
              onUploaded('');
            }}
            className="text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Remove
          </button>
        )}
      </div>

      <div
        onClick={() => inputRef.current?.click()}
        className="relative w-full h-36 border-2 border-dashed border-gray-700 rounded-xl overflow-hidden cursor-pointer hover:border-indigo-500 transition-colors bg-gray-800/50 flex items-center justify-center group"
      >
        {preview ? (
          <Image src={preview} alt="Preview" fill className="object-cover" unoptimized />
        ) : (
          <div className="text-center p-3">
            <svg className="mx-auto w-7 h-7 text-gray-500 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            <p className="text-xs text-gray-400 mt-1.5">Click to upload photo</p>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-gray-900/70 flex items-center justify-center">
            <svg className="animate-spin h-6 w-6 text-indigo-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </div>
        )}
      </div>

      <div className="mt-1.5">
        <input
          type="text"
          value={preview ?? ''}
          onChange={(e) => {
            setPreview(e.target.value);
            onUploaded(e.target.value);
          }}
          placeholder="or paste image URL"
          className="w-full bg-gray-800/80 border border-gray-700/80 text-white placeholder-gray-500 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
    </div>
  );
}
