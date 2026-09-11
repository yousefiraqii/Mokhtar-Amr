'use client';

import { KeyboardEvent, useState } from 'react';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  label?: string;
  placeholder?: string;
}

export default function TagInput({ value, onChange, label = 'Tags', placeholder = 'Type and press Enter or comma…' }: TagInputProps) {
  const [input, setInput] = useState('');

  function addTag(raw: string) {
    const tag = raw.trim();
    if (tag && !value.includes(tag)) {
      onChange([...value, tag]);
    }
    setInput('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && input === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function handleBlur() {
    if (input.trim()) addTag(input);
  }

  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>}
      <div className="flex flex-wrap gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 min-h-[42px] focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent">
        {value.map((tag) => (
          <span key={tag} className="flex items-center gap-1 bg-indigo-600/30 text-indigo-300 text-xs font-medium px-2 py-1 rounded-md">
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              className="hover:text-white transition-colors"
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent text-white text-sm placeholder-gray-500 outline-none"
        />
      </div>
    </div>
  );
}
