'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Stethoscope,
  MessageSquare,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/medicos', label: 'Médicos', icon: Stethoscope },
  { href: '/leads', label: 'Leads', icon: MessageSquare },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-[260px] shrink-0 flex-col border-r border-black/[0.06] bg-white/80 backdrop-blur-xl">
      <div className="px-6 py-7">
        <div className="text-[22px] font-semibold tracking-tight text-[#1d1d1f]">
          Lente
        </div>
        <div className="mt-0.5 text-[13px] font-normal text-[#86868b]">
          Captura de Leads
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {nav.map(({ href, label, icon: Icon }) => {
          const active =
            href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-normal transition-all duration-200',
                active
                  ? 'bg-[#1d1d1f] text-white'
                  : 'text-[#1d1d1f] hover:bg-[#f5f5f7]'
              )}
            >
              <Icon className={cn('h-[18px] w-[18px]', active ? 'text-white' : 'text-[#86868b]')} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-black/[0.06] px-6 py-4">
        <p className="text-[12px] text-[#86868b]">34 médicos · Uazapi</p>
      </div>
    </aside>
  );
}
