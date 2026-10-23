'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatMetaApiError } from '@/lib/meta-ads/errors';

interface AnalyticsAdsSyncProps {
  dateFrom: string;
  dateTo: string;
  doctorId: string | null;
}

interface SyncNote {
  platform: 'Meta' | 'Google';
  message: string;
}

export function AnalyticsAdsSync({
  dateFrom,
  dateTo,
  doctorId,
}: AnalyticsAdsSyncProps) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(true);
  const [notes, setNotes] = useState<SyncNote[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setSyncing(true);
      setNotes([]);

      const payload = {
        date_from: dateFrom,
        date_to: dateTo,
        doctor_id: doctorId,
      };

      const collected: SyncNote[] = [];

      try {
        const [metaRes, googleRes] = await Promise.all([
          fetch('/api/sync/meta-ads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }),
          fetch('/api/sync/google-ads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }),
        ]);

        const metaJson = (await metaRes.json()) as {
          error?: string;
          errors?: Array<{ error: string }>;
          social_warnings?: string[];
          rows_upserted?: number;
          doctors_synced?: number;
        };

        const googleJson = (await googleRes.json()) as {
          error?: string;
          errors?: Array<{ error: string }>;
          rows_upserted?: number;
          doctors_synced?: number;
          doctors_skipped?: number;
        };

        if (cancelled) return;

        if (!metaRes.ok) {
          collected.push({
            platform: 'Meta',
            message: metaJson.error || 'Falha ao sincronizar Meta Ads',
          });
        } else if (metaJson.errors?.length) {
          collected.push({
            platform: 'Meta',
            message: metaJson.errors
              .map((entry) => formatMetaApiError(entry.error))
              .join(' '),
          });
        } else if (
          metaJson.social_warnings?.length &&
          metaJson.rows_upserted === 0
        ) {
          collected.push({
            platform: 'Meta',
            message: `Orgânico/seguidores: ${metaJson.social_warnings[0]} Se zerado, confira se o token está salvo e se a Página + Instagram estão ligados ao usuário do sistema.`,
          });
        } else if (metaJson.doctors_synced === 0) {
          collected.push({
            platform: 'Meta',
            message:
              'Nenhum médico com META_ADS_ACCESS_TOKEN e META_ADS_ACCOUNT_ID configurados.',
          });
        }

        if (!googleRes.ok) {
          collected.push({
            platform: 'Google',
            message: googleJson.error || 'Falha ao sincronizar Google Ads',
          });
        } else if (googleJson.errors?.length) {
          collected.push({
            platform: 'Google',
            message: googleJson.errors.map((e) => e.error).join(' '),
          });
        } else if (
          googleJson.doctors_synced === 0 &&
          googleJson.rows_upserted === 0
        ) {
          collected.push({
            platform: 'Google',
            message:
              'Nenhum médico com credenciais Google Ads completas no tracking, ou sem gasto no período.',
          });
        }

        setNotes(collected);
        router.refresh();
      } catch (err) {
        if (!cancelled) {
          collected.push({
            platform: 'Meta',
            message:
              err instanceof Error ? err.message : 'Falha ao sincronizar anúncios',
          });
          setNotes(collected);
        }
      } finally {
        if (!cancelled) setSyncing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dateFrom, dateTo, doctorId, router]);

  return (
    <>
      {syncing && (
        <div className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-muted-surface)] px-4 py-3 text-[13px] text-[var(--brand-text-secondary)]">
          Atualizando métricas da Meta e Google Ads em segundo plano…
        </div>
      )}
      {!syncing &&
        notes.map((note) => (
          <div
            key={note.platform}
            className="rounded-xl border border-[#ff9500]/40 bg-[#ff9500]/10 px-4 py-3 text-[13px] text-[var(--brand-text)]"
          >
            <strong className="block text-[#ff9500]">Sync {note.platform}</strong>
            {note.message}
          </div>
        ))}
    </>
  );
}
