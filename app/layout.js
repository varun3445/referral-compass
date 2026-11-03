import Link from 'next/link';
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
        <footer className="site-footer">
          Prototype, not medical advice. Contains public sector information from NHS England and the CQC licensed under
          the{' '}
          <a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/">Open Government Licence v3.0</a>.{' '}
          <Link href="/data#licence">Full attribution</Link>.
        </footer>
      </body>
    </html>
  );
}
