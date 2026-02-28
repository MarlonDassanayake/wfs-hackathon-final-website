import type { Metadata } from 'next';
import './globals.css';
import NavBar from '@/components/NavBar';

export const metadata: Metadata = {
  title: 'ALETHEIA — Pocket-Sized Hedge Fund',
  description: 'AI-powered investment intelligence for contrarian investors.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen" style={{ backgroundColor: '#0D1117', color: '#E6EDF3' }}>
        <NavBar />
        <main className="min-h-screen" style={{ paddingTop: '60px' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
