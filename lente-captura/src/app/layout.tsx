import type { Metadata } from 'next';
import { Sidebar } from '@/components/sidebar';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lente — Captura de Leads',
  description: 'Sistema de captura de leads via WhatsApp para médicos',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className="min-h-screen bg-slate-50 text-slate-900 antialiased"
        suppressHydrationWarning
      >
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
