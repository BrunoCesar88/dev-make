'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { ColumnDefinition } from '@/types/database';

export function ColumnsEditor({
  initialColumns,
}: {
  initialColumns: ColumnDefinition[];
}) {
  const [columns, setColumns] = useState(initialColumns);
  const [saving, setSaving] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [adding, setAdding] = useState(false);

  const saveColumn = async (col: ColumnDefinition, label: string) => {
    setSaving(col.id);
    setMessage(null);
    try {
      const res = await fetch('/api/columns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: col.id, label }),
      });
      if (res.ok) {
        const updated = await res.json();
        setColumns((prev) =>
          prev.map((c) => (c.id === col.id ? { ...c, label: updated.label } : c))
        );
        setMessage('Coluna atualizada. Sync com planilhas enfileirado.');
      }
    } finally {
      setSaving(null);
    }
  };

  const addColumn = async () => {
    if (!newLabel.trim()) return;
    setAdding(true);
    setMessage(null);
    try {
      const res = await fetch('/api/columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newLabel.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setColumns((prev) => [...prev, data]);
        setNewLabel('');
        setMessage('Coluna criada. Sync com planilhas enfileirado.');
      } else {
        setMessage(data.error || 'Erro ao criar coluna');
      }
    } finally {
      setAdding(false);
    }
  };

  const deleteColumn = async (col: ColumnDefinition) => {
    if (col.is_system) return;
    if (!confirm(`Remover coluna "${col.label}"?`)) return;

    setMessage(null);
    const res = await fetch(`/api/columns/${col.id}`, { method: 'DELETE' });
    if (res.ok) {
      setColumns((prev) => prev.filter((c) => c.id !== col.id));
      setMessage('Coluna removida.');
    }
  };

  const processSync = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch('/api/sync/sheets', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMessage(
          `Sync concluído: ${data.processed} processados, ${data.failed} falhas.`
        );
      }
    } finally {
      setSyncing(false);
    }
  };

  const restoreSheetColumns = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch('/api/columns/restore-sheet', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setColumns(data.columns ?? []);
        setMessage(
          data.updated
            ? 'Colunas restauradas conforme a planilha (12 campos).'
            : 'Colunas já estavam corretas.'
        );
      } else {
        setMessage(data.error || 'Erro ao restaurar colunas');
      }
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <div className="rounded-2xl border border-[var(--brand-primary)]/20 bg-[var(--brand-primary-soft)] px-5 py-4 text-[14px] text-[var(--brand-text)]">
          {message}
        </div>
      )}

      <div className="apple-card flex flex-wrap gap-3 p-4">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Nome da nova coluna"
          className="min-w-[200px] flex-1 rounded-xl border border-black/[0.08] bg-white px-4 py-2.5 text-[14px] outline-none focus:border-[var(--brand-primary)]"
        />
        <button
          onClick={addColumn}
          disabled={adding || !newLabel.trim()}
          className="flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-[14px] font-medium text-white transition hover:bg-[var(--brand-primary-hover)] disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {adding ? 'Adicionando...' : 'Adicionar coluna'}
        </button>
      </div>

      <div className="apple-card overflow-hidden">
        <table className="w-full text-[14px]">
          <thead className="table-head">
            <tr>
              <th className="px-5 py-3.5 text-left font-medium text-[var(--brand-text-tertiary)]">Ordem</th>
              <th className="px-5 py-3.5 text-left font-medium text-[var(--brand-text-tertiary)]">Chave</th>
              <th className="px-5 py-3.5 text-left font-medium text-[var(--brand-text-tertiary)]">Rótulo</th>
              <th className="px-5 py-3.5 text-left font-medium text-[var(--brand-text-tertiary)]">Tipo</th>
              <th className="px-5 py-3.5 text-left font-medium text-[var(--brand-text-tertiary)]">Sistema</th>
              <th className="px-5 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.04]">
            {columns.map((col) => (
              <ColumnRow
                key={col.id}
                column={col}
                saving={saving === col.id}
                onSave={saveColumn}
                onDelete={deleteColumn}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={restoreSheetColumns}
          disabled={syncing}
          className="rounded-xl border border-[var(--brand-border)] px-5 py-2.5 text-[14px] font-medium text-[var(--brand-text)] transition hover:bg-[var(--brand-hover)] disabled:opacity-50"
        >
          {syncing ? 'Restaurando...' : 'Restaurar colunas da planilha'}
        </button>
        <button
          onClick={processSync}
          disabled={syncing}
          className="rounded-xl bg-[var(--brand-primary)] px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-[var(--brand-primary-hover)] disabled:opacity-50"
        >
          {syncing ? 'Processando fila...' : 'Processar fila de sync Sheets'}
        </button>
      </div>
    </div>
  );
}

function ColumnRow({
  column,
  saving,
  onSave,
  onDelete,
}: {
  column: ColumnDefinition;
  saving: boolean;
  onSave: (col: ColumnDefinition, label: string) => void;
  onDelete: (col: ColumnDefinition) => void;
}) {
  const [label, setLabel] = useState(column.label);

  return (
    <tr className="hover:bg-[var(--brand-bg)]/60">
      <td className="px-5 py-3.5 text-[var(--brand-text-tertiary)]">{column.display_order}</td>
      <td className="px-5 py-3.5 font-mono text-[12px] text-[var(--brand-text-tertiary)]">{column.key}</td>
      <td className="px-5 py-3.5">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => {
            if (label !== column.label) onSave(column, label);
          }}
          disabled={saving}
          className="w-full rounded-lg border border-black/[0.08] bg-white px-3 py-1.5 text-[14px] outline-none focus:border-[var(--brand-primary)]"
        />
      </td>
      <td className="px-5 py-3.5 text-[var(--brand-text-tertiary)]">{column.column_type}</td>
      <td className="px-5 py-3.5">
        {column.is_system ? (
          <span className="text-[var(--brand-text-tertiary)]">Sim</span>
        ) : (
          <span className="text-[#34c759]">Não</span>
        )}
      </td>
      <td className="px-5 py-3.5 text-right">
        {!column.is_system && (
          <button
            onClick={() => onDelete(column)}
            className="rounded-lg p-2 text-[var(--brand-text-tertiary)] transition hover:bg-[#ff3b30]/10 hover:text-[#ff3b30]"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </td>
    </tr>
  );
}
