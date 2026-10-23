'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, X } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export interface AdminUserRow {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface AdminUsersManagerProps {
  initialUsers: AdminUserRow[];
  currentUserId: string;
}

export function AdminUsersManager({
  initialUsers,
  currentUserId,
}: AdminUsersManagerProps) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
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
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          role: 'admin',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao criar usuário');
        return;
      }
      setUsers((prev) => [...prev, { ...data, is_active: true, created_at: new Date().toISOString() }]);
      setMessage('Administrador criado com sucesso.');
      setOpen(false);
      resetForm();
      router.refresh();
    } catch {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (user: AdminUserRow) => {
    if (user.id === currentUserId) return;
    setMessage(null);
    const res = await fetch(`/api/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !user.is_active }),
    });
    if (res.ok) {
      const updated = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...updated } : u)));
      setMessage(updated.is_active ? 'Usuário ativado.' : 'Usuário desativado.');
    }
  };

  const deleteUser = async (user: AdminUserRow) => {
    if (user.id === currentUserId) return;
    if (!confirm(`Excluir permanentemente ${user.full_name || user.email}?`)) return;

    setMessage(null);
    const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || 'Erro ao excluir');
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== user.id));
    setMessage('Usuário excluído.');
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {message && (
        <div className="rounded-xl border border-[var(--brand-primary)]/20 bg-[var(--brand-primary-soft)] px-4 py-3 text-[14px] text-[var(--brand-text)]">
          {message}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            resetForm();
            setOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-accent)] px-4 py-2.5 text-[14px] font-medium text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Adicionar administrador
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)]">
        <table className="w-full min-w-[640px] text-[14px]">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-[var(--brand-text-tertiary)]">Nome</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--brand-text-tertiary)]">E-mail</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--brand-text-tertiary)]">Status</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--brand-text-tertiary)]">Criado em</th>
              <th className="px-4 py-3 text-right font-medium text-[var(--brand-text-tertiary)]">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--brand-border)]">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-[var(--brand-hover)]/40">
                <td className="px-4 py-3 font-medium text-[var(--brand-text)]">
                  {user.full_name || '—'}
                  {user.id === currentUserId && (
                    <span className="ml-2 text-[11px] text-[var(--brand-text-tertiary)]">(você)</span>
                  )}
                </td>
                <td className="px-4 py-3 text-[var(--brand-text-secondary)]">{user.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      user.is_active
                        ? 'text-[#34c759]'
                        : 'text-[var(--brand-text-tertiary)]'
                    }
                  >
                    {user.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-[var(--brand-text-tertiary)]">
                  {formatDate(user.created_at)}
                </td>
                <td className="px-4 py-3 text-right">
                  {user.id !== currentUserId && (
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => toggleActive(user)}
                        className="rounded-lg border border-[var(--brand-border)] px-3 py-1.5 text-[12px] text-[var(--brand-text-secondary)] hover:bg-[var(--brand-hover)]"
                      >
                        {user.is_active ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteUser(user)}
                        className="rounded-lg p-1.5 text-[var(--brand-text-tertiary)] hover:bg-[#ff3b30]/10 hover:text-[#ff3b30]"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
              <h2 className="text-[18px] font-semibold text-[var(--brand-text)]">
                Novo administrador
              </h2>
              <button type="button" onClick={() => setOpen(false)} className="p-1">
                <X className="h-5 w-5 text-[var(--brand-text-tertiary)]" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-[var(--brand-text-tertiary)]">
                  Nome completo
                </span>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={fieldClass}
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-[var(--brand-text-tertiary)]">
                  E-mail
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={fieldClass}
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-[var(--brand-text-tertiary)]">
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
                <span className="mb-1.5 block text-[12px] font-medium text-[var(--brand-text-tertiary)]">
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
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-[var(--brand-border)] px-4 py-2 text-[14px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-[var(--brand-accent)] px-4 py-2 text-[14px] font-medium text-white disabled:opacity-50"
                >
                  {loading ? 'Criando…' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
