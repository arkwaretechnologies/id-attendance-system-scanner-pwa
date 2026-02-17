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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
