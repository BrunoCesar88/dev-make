'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, X } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export interface TeamMemberRow {
  assignment_id?: string;
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
}

interface DoctorTeamManagerProps {
  doctorId: string;
  doctorName: string;
  initialTeam: TeamMemberRow[];
}

export function DoctorTeamManager({
  doctorId,
  doctorName,
  initialTeam,
}: DoctorTeamManagerProps) {
  const router = useRouter();
  const [team, setTeam] = useState(initialTeam);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const fieldClass =
    'w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2.5 text-[14px] text-[var(--brand-text)] outline-none focus:border-[var(--brand-accent)]';

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/doctors/${doctorId}/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao criar usuário');
        return;
      }
      setTeam((prev) => [
        ...prev,
        {
          id: data.id,
          email: data.email,
          full_name: data.full_name,
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ]);
      setMessage('Secretária adicionada à equipe.');
      setOpen(false);
      resetForm();
      router.refresh();
    } catch {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const removeFromTeam = async (user: TeamMemberRow) => {
    if (!confirm(`Remover ${user.full_name || user.email} da equipe de ${doctorName}?`)) return;
    setMessage(null);
    const res = await fetch(`/api/doctors/${doctorId}/team/${user.id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setTeam((prev) => prev.filter((m) => m.id !== user.id));
      setMessage('Usuário removido da equipe.');
    }
  };

  const deleteUser = async (user: TeamMemberRow) => {
    if (!confirm(`Excluir permanentemente ${user.full_name || user.email}?`)) return;
    setMessage(null);
    const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || 'Erro ao excluir');
      return;
    }
    setTeam((prev) => prev.filter((m) => m.id !== user.id));
    setMessage('Usuário excluído do sistema.');
    router.refresh();
  };

  return (
    <section className="apple-card p-6 lg:p-8">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[21px] font-semibold text-[var(--brand-text)]">Equipe</h2>
          <p className="mt-1 text-[14px] text-[var(--brand-text-tertiary)]">
            Secretárias com acesso aos leads de {doctorName}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-accent)] px-4 py-2 text-[14px] font-medium text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Adicionar secretária
        </button>
      </div>

      {message && (
        <div className="mb-4 rounded-xl border border-[var(--brand-primary)]/20 bg-[var(--brand-primary-soft)] px-4 py-3 text-[14px]">
          {message}
        </div>
      )}

      {team.length === 0 ? (
        <p className="text-[15px] text-[var(--brand-text-tertiary)]">
          Nenhum usuário na equipe ainda.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-[14px]">
            <thead className="table-head">
              <tr>
                <th className="px-3 py-2 text-left text-[var(--brand-text-tertiary)]">Nome</th>
                <th className="px-3 py-2 text-left text-[var(--brand-text-tertiary)]">E-mail</th>
                <th className="px-3 py-2 text-left text-[var(--brand-text-tertiary)]">Status</th>
                <th className="px-3 py-2 text-left text-[var(--brand-text-tertiary)]">Desde</th>
                <th className="px-3 py-2 text-right text-[var(--brand-text-tertiary)]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--brand-border)]">
              {team.map((member) => (
                <tr key={member.id}>
                  <td className="px-3 py-2.5 font-medium">{member.full_name || '—'}</td>
                  <td className="px-3 py-2.5 text-[var(--brand-text-secondary)]">{member.email}</td>
                  <td className="px-3 py-2.5">
                    {member.is_active ? (
                      <span className="text-[#34c759]">Ativo</span>
                    ) : (
                      <span className="text-[var(--brand-text-tertiary)]">Inativo</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-[var(--brand-text-tertiary)]">
                    {formatDate(member.created_at)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => removeFromTeam(member)}
                        className="rounded-lg border border-[var(--brand-border)] px-2.5 py-1 text-[12px] hover:bg-[var(--brand-hover)]"
                      >
                        Remover
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteUser(member)}
                        className="rounded-lg p-1.5 text-[var(--brand-text-tertiary)] hover:bg-[#ff3b30]/10 hover:text-[#ff3b30]"
                        title="Excluir do sistema"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Fechar"
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[18px] font-semibold">Nova secretária</h2>
              <button type="button" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-[12px] text-[var(--brand-text-tertiary)]">Nome</span>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={fieldClass}
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] text-[var(--brand-text-tertiary)]">E-mail</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={fieldClass}
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] text-[var(--brand-text-tertiary)]">
                  Senha temporária
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={fieldClass}
                  minLength={8}
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] text-[var(--brand-text-tertiary)]">
                  Confirmar senha
                </span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={fieldClass}
                  minLength={8}
                  required
                />
              </label>
              {error && <p className="text-[13px] text-[#dc2626]">{error}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg border px-4 py-2 text-[14px]">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-[var(--brand-accent)] px-4 py-2 text-[14px] text-white disabled:opacity-50"
                >
                  {loading ? 'Criando…' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
