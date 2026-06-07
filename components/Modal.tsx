'use client';

import { useEffect, type ReactNode } from 'react';
import { IconClose } from './icons';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  icon: ReactNode;
  title: string;
  sub?: string;
  width?: number;
  children: ReactNode;
  /** Optional footer content (note text + actions). */
  foot?: ReactNode;
}

export function Modal({ open, onClose, icon, title, sub, width = 540, children, foot }: ModalProps) {
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
    <div className="scrim" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal" style={{ maxWidth: width }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="mh-icon">{icon}</div>
          <div className="mh-text">
            <h2>{title}</h2>
            {sub && <div className="mh-sub">{sub}</div>}
          </div>
          <button className="icon-btn modal-close" onClick={onClose} aria-label="Close">
            <IconClose size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {foot && <div className="modal-foot">{foot}</div>}
      </div>
    </div>
  );
}
