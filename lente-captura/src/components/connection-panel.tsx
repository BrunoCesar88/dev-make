'use client';

import { useCallback, useState } from 'react';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { StatusBadge } from './status-badge';
import { cn } from '@/lib/utils';

type ConnectMode = 'qr' | 'pairing';

interface ConnectionPanelProps {
  doctorId: string;
  doctorName: string;
  initialStatus?: string;
  defaultPhone?: string | null;
  embedded?: boolean;
}

export function ConnectionPanel({
  doctorId,
  doctorName,
  initialStatus = 'disconnected',
  defaultPhone,
  embedded = false,
}: ConnectionPanelProps) {
  const [status, setStatus] = useState(initialStatus);
  const [mode, setMode] = useState<ConnectMode>('qr');
  const [phone, setPhone] = useState(
    defaultPhone?.replace(/\D/g, '') || ''
  );
  const [qrcode, setQrcode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawStatus, setRawStatus] = useState<string | null>(null);
  const [checkedOnce, setCheckedOnce] = useState(false);

  const applyConnectResponse = (data: {
    status?: string;
    qrcode?: string;
    pairingCode?: string;
    error?: string;
    rawStatus?: string;
  }) => {
    if (data.status) setStatus(data.status);
    if (data.qrcode) setQrcode(data.qrcode);
    if (data.pairingCode) setPairingCode(data.pairingCode);
    if (data.rawStatus) setRawStatus(data.rawStatus);
    if (data.error) setError(data.error);
  };

  const checkStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/instances/${doctorId}/status`);
      const data = await res.json();
      applyConnectResponse(data);
      setCheckedOnce(true);
    } catch {
      setError('Falha ao verificar status');
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  const startConnect = async () => {
    if (mode === 'pairing' && !phone.trim()) {
      setError('Informe o telefone com DDD para gerar o código');
      return;
    }

    setConnecting(true);
    setError(null);
    setQrcode(null);
    setPairingCode(null);

    try {
      const res = await fetch(`/api/instances/${doctorId}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          phone: mode === 'pairing' ? phone.replace(/\D/g, '') : undefined,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        applyConnectResponse(data);
        if (!data.qrcode && !data.pairingCode && mode === 'qr') {
          setError(
            'Uazapi não retornou QR Code. Tente novamente ou use conexão por código.'
          );
        }
      }
    } catch {
      setError('Falha ao iniciar conexão');
    } finally {
      setConnecting(false);
    }
  };

  const qrSrc = qrcode?.startsWith('data:')
    ? qrcode
    : qrcode
      ? `data:image/png;base64,${qrcode}`
      : null;

  const isConnected = status === 'connected';

  const content = (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3
            className={
              embedded
                ? 'text-[17px] font-semibold text-[var(--brand-text)]'
                : 'text-[21px] font-semibold text-[var(--brand-text)]'
            }
          >
            Conexão WhatsApp
          </h3>
          {!embedded && (
            <p className="text-[14px] text-[var(--brand-text-tertiary)]">{doctorName}</p>
          )}
        </div>
        <StatusBadge status={status} />
      </div>

      {!isConnected && (
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setMode('qr')}
            className={modeBtnClass(mode === 'qr')}
          >
            QR Code
          </button>
          <button
            type="button"
            onClick={() => setMode('pairing')}
            className={modeBtnClass(mode === 'pairing')}
          >
            Código
          </button>
        </div>
      )}

      {isConnected ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl bg-[var(--brand-success-soft)] p-4 text-[var(--brand-success-text)]">
            <Wifi className="h-5 w-5" />
            <span className="text-[14px] font-medium">WhatsApp conectado e operacional</span>
          </div>
          <button
            onClick={startConnect}
            disabled={connecting || loading}
            className="rounded-xl border border-black/[0.08] px-4 py-2.5 text-[14px] font-medium text-[var(--brand-text)] transition hover:bg-[var(--brand-bg)] disabled:opacity-50"
          >
            Reconectar
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl bg-[var(--brand-orange-soft)] p-4 text-[var(--brand-orange-text)]">
            <WifiOff className="h-5 w-5" />
            <span className="text-[14px]">
              {mode === 'pairing'
                ? 'Informe o telefone e gere o código de pareamento'
                : status === 'connecting'
                  ? 'Escaneie o QR Code no WhatsApp'
                  : 'Gere o QR Code ou use conexão por código'}
            </span>
          </div>

          {mode === 'pairing' && (
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[var(--brand-text-tertiary)]">
                Telefone do WhatsApp (com DDI + DDD)
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="5511999999999"
                className="w-full rounded-xl border border-black/[0.08] bg-white px-4 py-2.5 text-[14px] outline-none focus:border-[var(--brand-primary)]"
              />
            </div>
          )}

          {pairingCode && mode === 'pairing' && (
            <div className="rounded-xl border border-[var(--brand-primary)]/20 bg-[var(--brand-primary-soft)] p-6 text-center">
              <p className="mb-2 text-[13px] text-[var(--brand-text-tertiary)]">Código de pareamento</p>
              <p className="font-mono text-[32px] font-semibold tracking-[0.2em] text-[var(--brand-text)]">
                {pairingCode}
              </p>
              <p className="mt-3 text-[12px] text-[var(--brand-text-tertiary)]">
                WhatsApp → Aparelhos conectados → Conectar com número de telefone
              </p>
            </div>
          )}

          {qrSrc && mode === 'qr' && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-black/[0.08] bg-[var(--brand-bg)] p-6">
              <img
                src={qrSrc}
                alt="QR Code WhatsApp"
                className="h-64 w-64 rounded-xl"
              />
              <p className="text-center text-[12px] text-[var(--brand-text-tertiary)]">
                WhatsApp → Aparelhos conectados → Conectar aparelho
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={startConnect}
              disabled={connecting || loading}
              className="rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-[14px] font-medium text-white transition hover:bg-[var(--brand-primary-hover)] disabled:opacity-50"
            >
              {connecting
                ? 'Gerando...'
                : mode === 'pairing'
                  ? pairingCode
                    ? 'Atualizar código'
                    : 'Gerar código'
                  : qrcode
                    ? 'Atualizar QR Code'
                    : 'Gerar QR Code'}
            </button>
            <button
              onClick={checkStatus}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-black/[0.08] px-4 py-2.5 text-[14px] font-medium text-[var(--brand-text)] transition hover:bg-[var(--brand-bg)] disabled:opacity-50"
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              Verificar status
            </button>
          </div>
        </div>
      )}

      {rawStatus && (
        <p className="mt-3 text-[12px] text-[var(--brand-text-tertiary)]">Status Uazapi: {rawStatus}</p>
      )}
      {!checkedOnce && !isConnected && (
        <p className="mt-2 text-[12px] text-[var(--brand-text-tertiary)]">
          Clique em &quot;Verificar status&quot; para consultar a Uazapi.
        </p>
      )}
      {error && <p className="mt-3 text-[14px] text-[#ff3b30]">{error}</p>}
    </>
  );

  if (embedded) {
    return content;
  }

  return <div className="apple-card p-6 lg:p-8">{content}</div>;
}

function modeBtnClass(active: boolean) {
  return `rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${
    active
      ? 'bg-[var(--brand-primary)] text-[var(--brand-on-primary)]'
      : 'bg-[var(--brand-muted-surface)] text-[var(--brand-text)] hover:bg-[var(--brand-hover)]'
  }`;
}
