'use client';
import { useEffect, useId, useRef, useState } from 'react';
import Icon from './Icon';

// A 44px info button that opens a small note below it. Works with keyboard:
// Enter or Space toggles, Esc closes and returns focus, Tab away closes.
export default function InfoTip({ label, children }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const wrap = useRef(null);
  const btn = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (!wrap.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); } };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <span
      ref={wrap}
      style={{ display: 'contents' }}
      onBlur={(e) => { if (!wrap.current?.contains(e.relatedTarget)) setOpen(false); }}
    >
      <button
        ref={btn}
        type="button"
        className="info-btn"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="info" size={18} />
        <span className="visually-hidden">About {label}</span>
      </button>
      <span id={id} role="note" className="info-pop" hidden={!open}>{children}</span>
    </span>
  );
}
