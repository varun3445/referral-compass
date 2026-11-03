import './globals.css';
import TopBar from '@/components/TopBar';

export const metadata = {
  title: 'Referral Compass',
  description: 'Compare NHS waiting times, CQC ratings and distance for a GP referral.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-GB">
      <body>
        <TopBar />
        {children}
      </body>
    </html>
  );
}
