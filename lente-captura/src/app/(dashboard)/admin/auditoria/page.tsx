import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AuditoriaPage() {
  const profile = await getProfile();
  if (profile?.role !== 'admin') redirect('/');

  const supabase = await createClient();
  const { data: logs } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div className="px-8 py-10 lg:px-12">
      <header className="mb-10">
        <h1 className="text-[40px] font-semibold tracking-tight text-[var(--brand-text)]">
          Auditoria
        </h1>
        <p className="mt-1 text-[17px] text-[var(--brand-text-tertiary)]">
          Histórico de alterações no sistema
        </p>
      </header>

      {!logs?.length ? (
        <div className="apple-card p-16 text-center">
          <p className="text-[17px] text-[var(--brand-text-tertiary)]">Nenhum registro ainda</p>
        </div>
      ) : (
        <div className="apple-card overflow-hidden">
          <table className="w-full text-[14px]">
            <thead className="table-head">
              <tr>
                <th className="px-5 py-3.5 text-left font-medium text-[var(--brand-text-tertiary)]">Data</th>
                <th className="px-5 py-3.5 text-left font-medium text-[var(--brand-text-tertiary)]">Usuário</th>
                <th className="px-5 py-3.5 text-left font-medium text-[var(--brand-text-tertiary)]">Ação</th>
                <th className="px-5 py-3.5 text-left font-medium text-[var(--brand-text-tertiary)]">Campo</th>
                <th className="px-5 py-3.5 text-left font-medium text-[var(--brand-text-tertiary)]">De → Para</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-[var(--brand-bg)]/60">
                  <td className="whitespace-nowrap px-5 py-3.5 text-[var(--brand-text-tertiary)]">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="px-5 py-3.5 text-[var(--brand-text)]">
                    <div>{log.user_email}</div>
                    <div className="text-[12px] text-[var(--brand-text-tertiary)]">{log.user_role}</div>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-[12px] text-[var(--brand-text-tertiary)]">
                    {log.action}
                  </td>
                  <td className="px-5 py-3.5 text-[var(--brand-text-tertiary)]">{log.field_key || '—'}</td>
                  <td className="px-5 py-3.5 text-[var(--brand-text)]">
                    {log.old_value || '—'} → {log.new_value || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
