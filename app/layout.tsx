import type { Metadata, Viewport } from 'next';
import './global.css';
import { Providers } from './Providers';

export const metadata: Metadata = {
  title: 'ID Attendance Scanner',
  description: 'RFID attendance scanner – works offline',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#6366F1',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href="/favicon.png" />
      </head>
      <body>
        <Providers>
          <div className="min-h-screen page-template-bg relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
              <div className="absolute -top-24 -left-24 w-96 h-96 opacity-30 page-shape page-shape--tl" />
              <div className="absolute -bottom-32 -right-32 w-[28rem] h-[28rem] opacity-30 page-shape page-shape--br" />
              <div className="absolute top-1/3 right-0 w-64 h-64 opacity-20 page-shape page-shape--r" />
            </div>
            <div className="relative z-10 min-h-screen">{children}</div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
