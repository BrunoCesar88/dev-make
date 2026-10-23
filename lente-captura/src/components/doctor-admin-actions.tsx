'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Trash2 } from 'lucide-react';

interface Manager {
  id: string;
  name: string;
}

interface DoctorAdminActionsProps {
  doctorId: string;
  doctorName: string;
  instanceName: string;
  currentManagerId: string | null;
  managers: Manager[];
}

const inputClass = 'input-field';

const outlineButtonClass =
  'rounded-xl border border-[var(--brand-border)] px-5 py-2.5 text-[14px] font-medium text-[var(--brand-text)] transition hover:bg-[var(--brand-hover)]';

export function DoctorAdminActions({
  doctorId,
  doctorName,
  instanceName,
  currentManagerId,
  managers,
}: DoctorAdminActionsProps) {
  const router = useRouter();
  const [managerId, setManagerId] = useState(currentManagerId ?? '');
  const [savingManager, setSavingManager] = useState(false);
  const [managerMessage, setManagerMessage] = useState<string | null>(null);
  const [managerError, setManagerError] = useState<string | null>(null);

  const [showDelete, setShowDelete] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleSaveManager = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingManager(true);
    setManagerMessage(null);
    setManagerError(null);

    try {
      const res = await fetch(`/api/doctors/${doctorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manager_id: managerId || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setManagerError(data.error || 'Erro ao salvar gestor');
        return;
      }

      setManagerMessage('Gestor atualizado');
      router.refresh();
    } catch {
      setManagerError('Erro de conexão');
    } finally {
      setSavingManager(false);
    }
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/doctors/${doctorId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirm_instance_name: confirmName.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setDeleteError(data.error || 'Erro ao excluir médico');
        return;
      }

      router.push('/medicos');
      router.refresh();
    } catch {
      setDeleteError('Erro de conexão');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="apple-card p-6 lg:p-8">
      <h2 className="text-[21px] font-semibold text-[var(--brand-text)]">
        Administração
      </h2>
      <p className="mt-1 text-[14px] text-[var(--brand-text-tertiary)]">
        Altere o gestor responsável ou remova o médico do sistema
      </p>

      <form onSubmit={handleSaveManager} className="mt-6 max-w-md">
        <label className="mb-1.5 block text-[13px] font-medium text-[var(--brand-text-tertiary)]">
          Gestor
        </label>
        <select
          value={managerId}
          onChange={(e) => setManagerId(e.target.value)}
          className={inputClass}
        >
          <option value="">Sem gestor</option>
          {managers.map((manager) => (
            <option key={manager.id} value={manager.id}>
              {manager.name}
            </option>
          ))}
        </select>

        {managerError && (
          <p className="mt-2 text-[14px] text-[#ff3b30]">{managerError}</p>
        )}
        {managerMessage && (
          <p className="mt-2 text-[14px] text-[#34c759]">{managerMessage}</p>
        )}

        <button
          type="submit"
          disabled={savingManager}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-[var(--brand-primary-hover)] disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {savingManager ? 'Salvando...' : 'Salvar gestor'}
        </button>
      </form>

      <div className="mt-8 border-t border-[var(--brand-border)] pt-8">
        {!showDelete ? (
          <button
            type="button"
            onClick={() => setShowDelete(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-[#ff3b30]/30 px-5 py-2.5 text-[14px] font-medium text-[#ff3b30] transition hover:bg-[#ff3b30]/5"
          >
            <Trash2 className="h-4 w-4" />
            Excluir médico
          </button>
        ) : (
          <form onSubmit={handleDelete} className="max-w-md">
            <p className="text-[15px] font-medium text-[var(--brand-text)]">
              Excluir {doctorName}?
            </p>
            <p className="mt-2 text-[14px] text-[var(--brand-text-tertiary)]">
              Isso remove o médico, a instância WhatsApp, leads e configurações
              associadas. Esta ação não pode ser desfeita.
            </p>
            <label className="mt-4 mb-1.5 block text-[13px] font-medium text-[var(--brand-text-tertiary)]">
              Digite <span className="font-mono">{instanceName}</span> para confirmar
            </label>
            <input
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={instanceName}
              className={`${inputClass} font-mono text-[13px]`}
              autoComplete="off"
            />

            {deleteError && (
              <p className="mt-2 text-[14px] text-[#ff3b30]">{deleteError}</p>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={deleting || confirmName.trim() !== instanceName}
                className="rounded-xl bg-[#ff3b30] px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-[#e0352b] disabled:opacity-50"
              >
                {deleting ? 'Excluindo...' : 'Confirmar exclusão'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDelete(false);
                  setConfirmName('');
                  setDeleteError(null);
                }}
                className={outlineButtonClass}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
