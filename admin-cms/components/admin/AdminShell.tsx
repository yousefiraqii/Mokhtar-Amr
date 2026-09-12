'use client';

import { useEffect, useRef, useState } from 'react';
import Sidebar from './Sidebar';

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Desktop >= 768px: sidebar is always visible, drawer never needed.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) setOpen(false);
    };
    mq.addEventListener('change', onChange as EventListener);
    onChange(mq);
    return () => mq.removeEventListener('change', onChange as EventListener);
  }, []);

  // Lock page scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Escape closes the drawer; Tab keeps focus inside it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'Tab') {
        const el = drawerRef.current;
        const active = document.activeElement;
        if (el && active && !el.contains(active)) {
          const first = el.querySelector('a, button') as HTMLElement | null;
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="md:flex md:min-h-screen bg-gray-950 text-white">
      {/* Desktop sidebar (>= 768px) */}
      <div className="hidden md:flex">
        <Sidebar onNavigate={close} />
      </div>

      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile top bar (< 768px) */}
        <header className="flex md:hidden items-center justify-between sticky top-0 z-30 h-14 px-4 border-b border-gray-800 bg-gray-900/95 backdrop-blur">
          <span className="text-lg font-bold text-white">Portfolio CMS</span>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close navigation' : 'Open navigation'}
            aria-expanded={open}
            aria-controls="adminMobileNav"
            className="inline-flex items-center justify-center w-11 h-11 rounded-lg border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 transition-colors"
          >
            {open ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </header>

        {/* Mobile drawer (< 768px) */}
        {open && (
          <>
            <div className="fixed inset-0 z-40 bg-black/70 md:hidden" onClick={close} aria-hidden="true" />
            <div
              id="adminMobileNav"
              ref={drawerRef}
              className="fixed inset-y-0 left-0 z-50 md:hidden shadow-2xl"
            >
              <Sidebar onNavigate={close} />
            </div>
          </>
        )}

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}