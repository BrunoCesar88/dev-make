'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';

interface PullFromSheetButtonProps {
  doctorId: string;
  hasSpreadsheet: boolean;
  lastImportedRow?: number;
}

export function PullFromSheetButton({
  doctorId,
  hasSpreadsheet,
  lastImportedRow = 0,
}: PullFromSheetButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const pull = async (mode: 'incremental' | 'full') => {
    if (!hasSpreadsheet) return;

    setLoading(true);
    setMessage(
      mode === 'incremental'
        ? 'Importando leads novos da planilha…'
        : 'Reimportando toda a planilha…'
    );

    try {
      const res = await fetch(`/api/doctors/${doctorId}/sync-from-sheet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || 'Erro ao importar planilha');
        return;
      }

      const parts = [
        `${data.imported} novos`,
        data.updated ? `${data.updated} atualizados` : null,
        `${data.processedRows} linhas processadas`,
        data.duplicatesRemoved
          ? `${data.duplicatesRemoved} duplicata(s) removida(s)`
          : null,
      ].filter(Boolean);

      setMessage(parts.join(' · '));
      router.refresh();
    } catch {
      setMessage('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => pull('incremental')}
          disabled={loading || !hasSpreadsheet}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-[14px] font-medium text-white transition hover:bg-[var(--brand-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          title={
            hasSpreadsheet
              ? 'Importa só leads novos (a partir da última linha importada)'
              : 'Vincule uma planilha a este médico'
          }
        >
          {loading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Importar leads
        </button>
        {hasSpreadsheet && (
          <button
            type="button"
            onClick={() => pull('full')}
            disabled={loading}
            className="text-[12px] text-[var(--brand-text-tertiary)] underline-offset-2 hover:text-[var(--brand-text)] hover:underline disabled:opacity-50"
          >
            Reimportar tudo
          </button>
        )}
      </div>
      {hasSpreadsheet && lastImportedRow > 0 && !message && (
        <p className="max-w-sm text-right text-[11px] text-[var(--brand-text-tertiary)]">
          Última linha importada: {lastImportedRow} · duplicatas evitadas por linha e
          telefone
        </p>
      )}
      {message && (
        <p className="max-w-sm text-right text-[12px] text-[var(--brand-text-tertiary)]">{message}</p>
      )}
    </div>
  );
}
