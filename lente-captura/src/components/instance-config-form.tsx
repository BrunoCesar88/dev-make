'use client';

import { useEffect, useState } from 'react';
import { Save, Webhook } from 'lucide-react';

interface WebhookOption {
  id: string;
  label: string;
  description: string;
}

interface InstanceConfigFormProps {
  doctorId: string;
  instanceName: string;
  appUrl: string;
  initialToken?: string | null;
  initialBaseUrl?: string;
  webhookConfigured?: boolean;
  embedded?: boolean;
}

export function InstanceConfigForm({
  doctorId,
  instanceName,
  appUrl,
  initialToken = '',
  initialBaseUrl = 'https://free.uazapi.com',
  webhookConfigured = false,
  embedded = false,
}: InstanceConfigFormProps) {
  const [token, setToken] = useState(initialToken || '');
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const lenteWebhookUrl = `${appUrl}/api/webhook/uazapi?instance=${encodeURIComponent(instanceName)}`;
  const lenteIngestUrl = `${appUrl}/api/webhook/ingest`;

  const [webhookTarget, setWebhookTarget] = useState<'lente' | 'n8n'>('lente');
  const [customWebhookUrl, setCustomWebhookUrl] = useState('');
  const [events, setEvents] = useState<string[]>(['messages']);
  const [excludeMessages, setExcludeMessages] = useState<string[]>([
    'wasSentByApi',
    'isGroupYes',
  ]);
  const [currentWebhook, setCurrentWebhook] = useState<string | null>(null);
  const [currentWebhookId, setCurrentWebhookId] = useState<string | null>(null);
  const [webhookCount, setWebhookCount] = useState(0);
  const [eventOptions, setEventOptions] = useState<WebhookOption[]>([]);
  const [excludeOptions, setExcludeOptions] = useState<WebhookOption[]>([]);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/instances/${doctorId}/webhook`)
      .then((r) => r.json())
      .then((data) => {
        if (data.events?.length) setEventOptions(data.events);
        if (data.excludeOptions?.length) setExcludeOptions(data.excludeOptions);

        if (data.webhooks?.length) setWebhookCount(data.webhooks.length);

        const activeHook = data.webhook || data.webhooks?.[0];
        if (activeHook?.url) {
          setCurrentWebhook(activeHook.url);
          if (activeHook.id) setCurrentWebhookId(activeHook.id);
        }
        if (activeHook?.url) {
          const activeUrl = activeHook.url;
          if (
            activeUrl.includes('/api/webhook/ingest') ||
            !activeUrl.includes('/api/webhook/uazapi')
          ) {
            setWebhookTarget('n8n');
            setCustomWebhookUrl(activeUrl);
          }
          if (activeHook.events?.length) setEvents(activeHook.events);
          if (activeHook.excludeMessages?.length) {
            setExcludeMessages(activeHook.excludeMessages);
          }
        }
      })
      .catch(() => {});
  }, [doctorId, token]);

  const resolvedWebhookUrl =
    webhookTarget === 'lente' ? lenteWebhookUrl : customWebhookUrl.trim();

  const toggleItem = (
    list: string[],
    setList: (v: string[]) => void,
    id: string
  ) => {
    setList(
      list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
    );
  };

  const selectAll = (
    options: WebhookOption[],
    setList: (v: string[]) => void
  ) => {
    setList(options.map((o) => o.id));
  };

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
          webhook_url: configureWebhook ? resolvedWebhookUrl : undefined,
          webhook_id: configureWebhook ? currentWebhookId || undefined : undefined,
          events,
          exclude_messages: excludeMessages,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setMessage(`Erro: ${data.error}`);
      } else if (data.warning) {
        setMessage(data.warning);
      } else {
        setMessage(
          configureWebhook
            ? `Webhook configurado: ${resolvedWebhookUrl}`
            : 'Token salvo!'
        );
        if (configureWebhook) {
          setCurrentWebhook(resolvedWebhookUrl);
          if (data.webhook?.id) setCurrentWebhookId(data.webhook.id);
          if (data.webhooks?.length) setWebhookCount(data.webhooks.length);
        }
      }
    } catch {
      setMessage('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const formContent = (
    <>
      <h3
        className={
          embedded
            ? 'mb-4 text-[17px] font-semibold text-[var(--brand-text)]'
            : 'mb-4 text-[21px] font-semibold text-[var(--brand-text)]'
        }
      >
        Configuração Uazapi
      </h3>

      <div className="space-y-6">
        <section className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[var(--brand-text-tertiary)]">
              URL Base Uazapi
            </label>
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className={inputClass}
              placeholder="https://lente.uazapi.com"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[var(--brand-text-tertiary)]">
              Token da Instância
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className={inputClass}
              placeholder="Token gerado ao criar a instância"
            />
          </div>
        </section>

        <section className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-inset)] p-4">
          <div className="mb-3 flex items-center gap-2">
            <Webhook className="h-4 w-4 text-[var(--brand-primary)]" />
            <h4 className="text-[15px] font-semibold text-[var(--brand-text)]">Webhook</h4>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setWebhookTarget('lente')}
              className={targetBtnClass(webhookTarget === 'lente')}
            >
              Lente (direto)
            </button>
            <button
              type="button"
              onClick={() => setWebhookTarget('n8n')}
              className={targetBtnClass(webhookTarget === 'n8n')}
            >
              n8n / URL customizada
            </button>
          </div>

          {webhookTarget === 'lente' ? (
            <div className="space-y-2">
              <p className="text-[13px] text-[var(--brand-text-tertiary)]">
                Mensagens vão direto para o Lente:
              </p>
              <code className="block rounded-lg bg-white p-3 text-[12px] break-all text-[var(--brand-text)]">
                {lenteWebhookUrl}
              </code>
              <p className="text-[12px] text-[var(--brand-text-tertiary)]">
                Via n8n (ingest): {lenteIngestUrl}
              </p>
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[var(--brand-text-tertiary)]">
                URL do webhook (n8n ou outro)
              </label>
              <input
                type="url"
                value={customWebhookUrl}
                onChange={(e) => setCustomWebhookUrl(e.target.value)}
                className={inputClass}
                placeholder="https://seu-n8n.com/webhook/..."
              />
            </div>
          )}

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-[var(--brand-text-tertiary)]">Eventos</p>
              {eventOptions.length > 0 && (
                <button
                  type="button"
                  onClick={() => selectAll(eventOptions, setEvents)}
                  className="text-[12px] text-[var(--brand-primary)] hover:underline"
                >
                  Selecionar todos
                </button>
              )}
            </div>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-black/[0.06] bg-white p-3">
              {eventOptions.length === 0 ? (
                <p className="text-[13px] text-[var(--brand-text-tertiary)]">
                  Salve o token para carregar os eventos da Uazapi
                </p>
              ) : (
                eventOptions.map((ev) => (
                  <label
                    key={ev.id}
                    className="flex cursor-pointer items-start gap-2 text-[13px]"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={events.includes(ev.id)}
                      onChange={() => toggleItem(events, setEvents, ev.id)}
                    />
                    <span>
                      <span className="font-medium text-[var(--brand-text)]">{ev.label}</span>
                      <span className="ml-1 font-mono text-[11px] text-[var(--brand-text-tertiary)]">
                        ({ev.id})
                      </span>
                      <span className="mt-0.5 block text-[12px] text-[var(--brand-text-tertiary)]">
                        {ev.description}
                      </span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-[var(--brand-text-tertiary)]">Excluir</p>
              {excludeOptions.length > 0 && (
                <button
                  type="button"
                  onClick={() => selectAll(excludeOptions, setExcludeMessages)}
                  className="text-[12px] text-[var(--brand-primary)] hover:underline"
                >
                  Selecionar todos
                </button>
              )}
            </div>
            <div className="max-h-36 space-y-2 overflow-y-auto rounded-lg border border-black/[0.06] bg-white p-3">
              {excludeOptions.map((opt) => (
                <label
                  key={opt.id}
                  className="flex cursor-pointer items-start gap-2 text-[13px]"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={excludeMessages.includes(opt.id)}
                    onChange={() =>
                      toggleItem(excludeMessages, setExcludeMessages, opt.id)
                    }
                  />
                  <span>
                    <span className="font-medium text-[var(--brand-text)]">{opt.label}</span>
                    <span className="ml-1 font-mono text-[11px] text-[var(--brand-text-tertiary)]">
                      ({opt.id})
                    </span>
                    <span className="mt-0.5 block text-[12px] text-[var(--brand-text-tertiary)]">
                      {opt.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {currentWebhook && (
            <p className="mt-3 text-[12px] text-[var(--brand-text-tertiary)]">
              Webhook ativo na Uazapi: {currentWebhook}
              {currentWebhookId && (
                <span className="ml-1 font-mono text-[11px]">({currentWebhookId})</span>
              )}
            </p>
          )}
          {webhookCount > 1 && (
            <p className="mt-2 text-[12px] text-[#ff9500]">
              Atenção: existem {webhookCount} webhooks nesta instância na Uazapi. Ao
              salvar, o Lente atualiza o principal e tenta remover duplicatas do
              mesmo médico. Apague manualmente os extras no painel Uazapi se
              necessário.
            </p>
          )}
        </section>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => save(false)}
            disabled={saving || !token}
            className="flex items-center gap-2 rounded-xl border border-black/[0.08] px-4 py-2.5 text-[14px] font-medium text-[var(--brand-text)] transition hover:bg-[var(--brand-bg)] disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            Salvar token
          </button>
          <button
            onClick={() => save(true)}
            disabled={
              saving || !token || (webhookTarget === 'n8n' && !customWebhookUrl.trim())
            }
            className="rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-[14px] font-medium text-white transition hover:bg-[var(--brand-primary-hover)] disabled:opacity-50"
          >
            Salvar + configurar webhook
          </button>
        </div>

        {webhookConfigured && !currentWebhook && (
          <p className="text-[13px] text-[#34c759]">✓ Webhook marcado como configurado</p>
        )}
        {message && <p className="text-[14px] text-[var(--brand-text-tertiary)]">{message}</p>}
      </div>
    </>
  );

  if (embedded) {
    return formContent;
  }

  return <div className="apple-card p-6 lg:p-8">{formContent}</div>;
}

const inputClass =
  'w-full rounded-xl border border-black/[0.08] bg-white px-4 py-2.5 text-[14px] outline-none focus:border-[var(--brand-primary)]';

function targetBtnClass(active: boolean) {
  return `rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${
    active
      ? 'bg-[var(--brand-primary)] text-[var(--brand-on-primary)]'
      : 'bg-[var(--brand-surface)] text-[var(--brand-text)] border border-[var(--brand-border)] hover:bg-[var(--brand-hover)]'
  }`;
}
