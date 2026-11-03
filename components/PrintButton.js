'use client';
import Icon from './Icon';

export default function PrintButton() {
  return (
    <button type="button" className="btn btn-primary" onClick={() => window.print()}>
      <Icon name="printer" size={20} />
      Print or save as PDF
    </button>
  );
}
