'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { StatusBadge } from './status-badge';

interface ConnectionPanelProps {
  doctorId: string;
  doctorName: string;
  initialStatus?: string;
}

export function ConnectionPanel({
  doctorId,
  doctorName,
  initialStatus = 'disconnected',
}: ConnectionPanelProps) {
  const [status, setStatus] = useState(initialStatus);
  const [qrcode, setQrcode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/instances/${doctorId}/status`);
      const data = await res.json();
      if (data.status) setStatus(data.status);
      if (data.qrcode) setQrcode(data.qrcode);
      if (data.error) setError(data.error);
    } catch {
      setError('Falha ao verificar status');
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  const startConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch(`/api/instances/${doctorId}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setStatus(data.status || 'connecting');
        if (data.qrcode) setQrcode(data.qrcode);
      }
    } catch {
      setError('Falha ao iniciar conexão');
    } finally {
      setConnecting(false);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const qrSrc = qrcode?.startsWith('data:')
    ? qrcode
    : qrcode
      ? `data:image/png;base64,${qrcode}`
      : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">Conexão WhatsApp</h3>
          <p className="text-sm text-slate-500">{doctorName}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      {status === 'connected' ? (
        <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-4 text-emerald-800">
          <Wifi className="h-5 w-5" />
          <span className="text-sm font-medium">WhatsApp conectado e operacional</span>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg bg-amber-50 p-4 text-amber-800">
            <WifiOff className="h-5 w-5" />
            <span className="text-sm">
              {status === 'connecting'
                ? 'Aguardando escaneamento do QR Code...'
                : 'WhatsApp desconectado — escaneie o QR Code para reconectar'}
            </span>
          </div>

          {qrSrc && (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6">
              <img
                src={qrSrc}
                alt="QR Code WhatsApp"
                className="h-64 w-64 rounded-lg"
              />
              <p className="text-center text-xs text-slate-500">
                Abra o WhatsApp → Aparelhos conectados → Conectar aparelho
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={startConnect}
              disabled={connecting || loading}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {connecting ? 'Gerando QR...' : qrcode ? 'Atualizar QR Code' : 'Conectar WhatsApp'}
            </button>
            <button
              onClick={checkStatus}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={cnIcon(loading)} />
              Verificar
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

function cnIcon(spin: boolean) {
  return spin ? 'h-4 w-4 animate-spin' : 'h-4 w-4';
}
