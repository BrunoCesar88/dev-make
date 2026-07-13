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
    <html lang="pt-BR" suppressHydrationWarning className="light">
      <body
        className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] antialiased"
        suppressHydrationWarning
      >
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto bg-[#f5f5f7]">{children}</main>
        </div>
      </body>
    </html>
  );
}
