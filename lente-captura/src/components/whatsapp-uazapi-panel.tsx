'use client';

import { ConnectionPanel } from '@/components/connection-panel';
import { InstanceConfigForm } from '@/components/instance-config-form';

interface WhatsAppUazapiPanelProps {
  doctorId: string;
  doctorName: string;
  instanceName: string;
  initialStatus?: string;
  defaultPhone?: string | null;
  appUrl: string;
  initialToken?: string | null;
  initialBaseUrl?: string;
  webhookConfigured?: boolean;
  isAdmin?: boolean;
}

export function WhatsAppUazapiPanel({
  doctorId,
  doctorName,
  instanceName,
  initialStatus,
  defaultPhone,
  appUrl,
  initialToken,
  initialBaseUrl,
  webhookConfigured,
  isAdmin = false,
}: WhatsAppUazapiPanelProps) {
  return (
    <section className="apple-card p-6 lg:p-8">
      <div className="mb-6">
        <h2 className="text-[21px] font-semibold text-[var(--brand-text)]">
          WhatsApp & Uazapi
        </h2>
        <p className="mt-1 text-[14px] text-[var(--brand-text-tertiary)]">
          Conexão do WhatsApp, token da instância e webhook
        </p>
      </div>

      <ConnectionPanel
        doctorId={doctorId}
        doctorName={doctorName}
        initialStatus={initialStatus}
        defaultPhone={defaultPhone}
        embedded
      />

      {isAdmin && (
        <>
          <div className="my-8 border-t border-black/[0.06]" />
          <InstanceConfigForm
            doctorId={doctorId}
            instanceName={instanceName}
            appUrl={appUrl}
            initialToken={initialToken}
            initialBaseUrl={initialBaseUrl}
            webhookConfigured={webhookConfigured}
            embedded
          />
        </>
      )}
    </section>
  );
}
