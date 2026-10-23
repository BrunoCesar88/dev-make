'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { RefreshCw, Sheet } from 'lucide-react';

interface PullAllLeadsButtonProps {
  label?: string;
  className?: string;
}

export function PullAllLeadsButton({
  label = 'Puxar leads das planilhas',
  className = '',
}: PullAllLeadsButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const pull = async () => {
    setLoading(true);
    setMessage(null);

    try {
      setMessage('Puxando planilhas… pode levar alguns minutos.');

      const res = await fetch('/api/leads/pull-from-sheets', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || 'Erro ao puxar planilhas');
        return;
      }

      const errorNote =
        data.errors?.length > 0
          ? (() => {
              const unique = [
                ...new Set(
                  (data.errors as { doctor: string; error: string }[]).map(
                    (e) => e.error
                  )
                ),
              ];
              if (unique.length === 1) return ` · Erro: ${unique[0]}`;
              return ` · ${data.errors.length} médico(s) com erro`;
            })()
          : '';

      setMessage(
        `${data.doctors} médicos · ${data.totalRows} linhas · ${data.imported} novos · ${data.updated} atualizados${errorNote}`
      );
      router.refresh();
    } catch {
      setMessage('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex flex-col items-end gap-2 ${className}`}>
      <button
        type="button"
        onClick={pull}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-[14px] font-medium text-white transition hover:bg-[var(--brand-primary-hover)] disabled:opacity-50"
      >
        {loading ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            Puxando…
          </>
        ) : (
          <Sheet className="h-4 w-4" />
        )}
        {label}
      </button>
      {message && (
        <p className="max-w-md text-right text-[12px] text-[var(--brand-text-tertiary)]">{message}</p>
      )}
    </div>
  );
}
