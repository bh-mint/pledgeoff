import type { Metadata } from 'next';
import './globals.css';
import './terminal.css';

export const metadata: Metadata = {
  title: { default: 'PledgeOFF — Private Terminal', template: '%s — PledgeOFF' },
  description: 'Your private financial workspace.',
  robots: { index: false, follow: false, nocache: true },
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-theme="dark"><body className="terminal-root">{children}</body></html>;
}
