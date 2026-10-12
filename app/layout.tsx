import type { Metadata } from 'next';
import './globals.css';
import { SiteHeader } from '@/components/Header';
import { SiteFooter } from '@/components/Footer';
import { ThemeProvider } from '@/components/ThemeProvider';
import { MatrixBg } from '@/components/MatrixBg';

export const metadata: Metadata = {
  title: 'Quasar — Demo Crypto Exchange',
  description: 'Quasar is a paper-trading demo crypto exchange. Live market data, zero real money.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-void text-slate-200 antialiased min-h-screen flex flex-col">
        <ThemeProvider>
          <MatrixBg />
          <div className="relative z-10 flex flex-col min-h-screen">
            <SiteHeader />
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">{children}</main>
            <SiteFooter />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
