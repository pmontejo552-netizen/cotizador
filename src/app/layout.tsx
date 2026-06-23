import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cotizador — Contratistas',
  description: 'Sistema de cotizaciones colaborativo',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-GT">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
