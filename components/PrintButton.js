'use client';

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      style={{
        minHeight: 48, padding: '0 20px', borderRadius: 8, border: 0,
        background: 'var(--accent)', color: '#fff', fontSize: 17, fontWeight: 600, cursor: 'pointer',
      }}
    >
      Print this summary
    </button>
  );
}
