import Link from 'next/link';
import './globals.css';
import { Plus_Jakarta_Sans } from 'next/font/google';
import TopBar from '@/components/TopBar';

// Plus Jakarta Sans via next/font (built into Next, no extra dependency), self-hosted at build time.
const sans = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-sans' });

export const metadata = {
  title: 'Referral Compass',
  description: 'Compare NHS trusts for a routine referral: waiting so far, CQC rating and distance.',
};

export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en-GB" className={sans.variable}>
      <body>
        <TopBar />
        {children}
        <footer className="site-footer">
          <p>
            Independent prototype, not an NHS service. Not for urgent or suspected cancer referrals. Contains public
            sector information licensed under the{' '}
            <a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/">Open Government Licence v3.0</a>.{' '}
            <Link href="/data#licence">Full attribution</Link>.
          </p>
        </footer>
      </body>
    </html>
  );
}
