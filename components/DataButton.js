'use client';
import { useEffect, useRef, useState } from 'react';
import DataContent from './DataContent';
import Icon from './Icon';
import styles from './TopBar.module.css';

// "Data and limits" button that opens the same content as /data in a native
// modal: X (44px), Esc and scrim click close it, focus returns to the button.
export default function DataButton({ className = '', placement = 'header' }) {
  const dialog = useRef(null);
  const trigger = useRef(null);
  const [open, setOpen] = useState(false);
  const titleId = `data-title-${placement}`;

  useEffect(() => { if (open && !dialog.current.open) dialog.current.showModal(); }, [open]);

  const close = () => dialog.current?.close();
  const onClose = () => { setOpen(false); trigger.current?.focus(); };
  const onClick = (e) => { if (e.target === dialog.current) close(); };

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={`btn btn-secondary ${styles.btn} ${className}`}
        data-data-button={placement}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        Data and limits
      </button>
      <dialog ref={dialog} className={styles.dialog} onClose={onClose} onClick={onClick} aria-labelledby={titleId}>
        {open && (
          <>
            <button type="button" className={styles.x} onClick={close} autoFocus>
              <Icon name="x" size={20} />
              <span className="visually-hidden">Close Data and limits</span>
            </button>
            <DataContent titleId={titleId} bare />
          </>
        )}
      </dialog>
    </>
  );
}
