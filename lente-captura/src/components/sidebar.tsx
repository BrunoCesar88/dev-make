'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Stethoscope,
  MessageSquare,
  Settings,
  Columns3,
  ScrollText,
  LogOut,
  BarChart3,
  Users,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';
import type { Profile, UserRole } from '@/lib/auth';

const baseNav: Array<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: UserRole[];
}> = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'doctor'] },
  { href: '/analytics', label: 'Analytics', icon: BarChart3, roles: ['admin', 'doctor'] },
  { href: '/medicos', label: 'Médicos', icon: Stethoscope, roles: ['admin'] },
  { href: '/leads', label: 'Leads', icon: MessageSquare, roles: ['admin', 'doctor', 'secretary'] },
  { href: '/configuracoes', label: 'Configurações', icon: Settings, roles: ['admin'] },
];

const adminNav = [
  { href: '/admin/usuarios', label: 'Usuários', icon: Users },
  { href: '/admin/colunas', label: 'Colunas', icon: Columns3 },
  { href: '/admin/auditoria', label: 'Auditoria', icon: ScrollText },
];

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  doctor: 'Médico',
  secretary: 'Secretária',
};

export function Sidebar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname();
  const isAdmin = profile?.role === 'admin';
  const role = profile?.role ?? 'secretary';

  const nav = [
    ...baseNav.filter((item) => !item.roles || item.roles.includes(role)),
    ...(isAdmin ? adminNav : []),
  ];

  return (
    <aside className="flex w-[248px] shrink-0 flex-col border-r border-[var(--brand-border)] bg-[var(--brand-surface)]">
      <div className="border-b border-[var(--brand-border)] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--brand-primary)] text-[15px] font-bold text-[var(--brand-on-primary)]">
            L
          </div>
          <div>
            <div className="text-[15px] font-semibold text-[var(--brand-text)]">
              Lente Captura
            </div>
            <div className="text-[11px] text-[var(--brand-text-tertiary)]">
              Operação &amp; leads
            </div>
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4">
        {nav.map(({ href, label, icon: Icon }) => {
          const active =
            href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
                active
                  ? 'bg-[var(--brand-primary)] text-[var(--brand-on-primary)]'
                  : 'text-[var(--brand-text-secondary)] hover:bg-[var(--brand-hover)] hover:text-[var(--brand-text)]'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}

      </nav>

      <div className="border-t border-[var(--brand-border)] px-5 py-4">
        {profile ? (
          <div className="space-y-3">
            <div>
              <p className="text-[13px] font-medium text-[var(--brand-text)]">
                {profile.full_name || profile.email}
              </p>
              <p className="text-[11px] text-[var(--brand-text-tertiary)]">
                {roleLabels[profile.role] || profile.role}
              </p>
            </div>
            <ThemeToggle compact showLabel={false} />
            <form action="/auth/logout" method="POST">
              <button
                type="submit"
                className="flex items-center gap-2 text-[12px] text-[var(--brand-text-tertiary)] transition hover:text-[var(--accent-red)]"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sair
              </button>
            </form>
          </div>
        ) : (
          <p className="text-[11px] text-[var(--brand-text-tertiary)]">WhatsApp · Uazapi</p>
        )}
      </div>
    </aside>
  );
}
