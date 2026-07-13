'use client';

import { useState } from 'react';
import { Save } from 'lucide-react';

interface InstanceConfigFormProps {
  doctorId: string;
  initialToken?: string | null;
  initialBaseUrl?: string;
  webhookConfigured?: boolean;
}

export function InstanceConfigForm({
  doctorId,
  initialToken = '',
  initialBaseUrl = 'https://free.uazapi.com',
  webhookConfigured = false,
}: InstanceConfigFormProps) {
  const [token, setToken] = useState(initialToken || '');
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const save = async (configureWebhook: boolean) => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/instances/${doctorId}/configure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uazapi_token: token,
          uazapi_base_url: baseUrl,
          configure_webhook: configureWebhook,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setMessage(`Erro: ${data.error}`);
      } else if (data.warning) {
        setMessage(data.warning);
      } else {
        setMessage(configureWebhook ? 'Salvo e webhook configurado!' : 'Token salvo!');
      }
    } catch {
      setMessage('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h3 className="mb-4 font-semibold text-slate-900">Configuração Uazapi</h3>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            URL Base Uazapi
          </label>
          <input
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="https://free.uazapi.com"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Token da Instância
          </label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Cole o token da instância Uazapi"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => save(false)}
            disabled={saving || !token}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            Salvar token
          </button>
          <button
            onClick={() => save(true)}
            disabled={saving || !token}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Salvar + configurar webhook
          </button>
        </div>
        {webhookConfigured && (
          <p className="text-xs text-emerald-600">✓ Webhook já configurado</p>
        )}
        {message && (
          <p className="text-sm text-slate-600">{message}</p>
        )}
      </div>
    </div>
  );
}
