'use client';
import { useEffect, useState } from 'react';
import { session } from '@/lib/nav';

// The patient's searched outcode (e.g. WC2N), read from the in-memory search
// in this tab. Never put in the URL. Opened directly, it says "your area".
export default function FromArea() {
  const [outcode, setOutcode] = useState(null);
  useEffect(() => { setOutcode(session.origin?.outcode || null); }, []);
  return <>{outcode || 'your area'}</>;
}
