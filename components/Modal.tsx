'use client';

import { useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  accent?: string;
  width?: number;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, accent = '#3742fa', width = 520, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 8, 16, 0.75)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 80,
        zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#131826',
          border: '1px solid #1f2940',
          borderTop: `3px solid ${accent}`,
          borderRadius: 12,
          padding: 24,
          width,
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: 'calc(100vh - 120px)',
          overflowY: 'auto',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: 0.02 }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid #2a3550',
              borderRadius: 6,
              padding: '4px 10px',
              color: '#8b96b0',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            Close (Esc)
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
