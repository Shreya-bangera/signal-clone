import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { WSProvider } from '@/components/WSProvider';
import { ThemeProvider } from '@/components/ThemeProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Signal',
  description: 'Signal — Private Messenger',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-[var(--app-bg)] text-[var(--text-primary)] antialiased`}>
        <ThemeProvider>
          <WSProvider>
            {children}
          </WSProvider>
        </ThemeProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' },
            success: { iconTheme: { primary: 'var(--accent)', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  );
}
