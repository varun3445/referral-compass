'use client';
import { useRouter } from 'next/navigation';
import { nav } from '@/lib/nav';
import Icon from './Icon';

// Returns to the search if we came from it in this tab, otherwise starts a new one.
export default function BackButton() {
  const router = useRouter();
  const goBack = () => {
    if (nav.fromConsole) router.back();
    else router.push('/');
  };
  return (
    <button type="button" className="btn btn-secondary" onClick={goBack}>
      <Icon name="arrow-left" size={20} />
      Back
    </button>
  );
}
