import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';

export default async function ConfiguracoesPage() {
  const profile = await getProfile();
  if (profile?.role !== 'admin') redirect('/');

  const webhookBase =
    process.env.NEXT_PUBLIC_APP_URL || 'https://seu-dominio.vercel.app';

  return (
    <div className="px-8 py-10 lg:px-12">
      <header className="mb-10">
        <h1 className="text-[40px] font-semibold tracking-tight text-[var(--brand-text)]">
          Configurações
        </h1>
        <p className="mt-1 text-[17px] text-[var(--brand-text-tertiary)]">
          Variáveis e instruções de setup
        </p>
      </header>

      <div className="max-w-2xl space-y-6">
        <section className="apple-card p-6 lg:p-8">
          <h2 className="mb-3 text-[21px] font-semibold text-[var(--brand-text)]">Webhook Uazapi</h2>
          <p className="mb-3 text-[15px] text-[var(--brand-text-tertiary)]">
            URL base para configurar em cada instância:
          </p>
          <code className="block rounded-xl bg-[var(--brand-bg)] p-4 text-[13px] break-all text-[var(--brand-text)]">
            {webhookBase}/api/webhook/uazapi?instance=INSTANCE
          </code>
        </section>

        <section className="apple-card p-6 lg:p-8">
          <h2 className="mb-3 text-[21px] font-semibold text-[var(--brand-text)]">Webhook n8n (ingest)</h2>
          <p className="mb-3 text-[15px] text-[var(--brand-text-tertiary)]">
            Para migração gradual do n8n:
          </p>
          <code className="block rounded-xl bg-[var(--brand-bg)] p-4 text-[13px] break-all text-[var(--brand-text)]">
            {webhookBase}/api/webhook/ingest
          </code>
        </section>

        <section className="apple-card p-6 lg:p-8">
          <h2 className="mb-3 text-[21px] font-semibold text-[var(--brand-text)]">Google Sheets</h2>
          <ol className="list-decimal space-y-2 pl-5 text-[15px] text-[var(--brand-text-tertiary)]">
            <li>Crie uma Service Account no Google Cloud Console</li>
            <li>Ative a Google Sheets API</li>
            <li>Baixe a chave JSON e configure as variáveis de ambiente</li>
            <li>Compartilhe cada planilha com o e-mail da service account (Editor)</li>
          </ol>
        </section>

        <section className="apple-card p-6 lg:p-8">
          <h2 className="mb-3 text-[21px] font-semibold text-[var(--brand-text)]">Supabase</h2>
          <ol className="list-decimal space-y-2 pl-5 text-[15px] text-[var(--brand-text-tertiary)]">
            <li>Projeto em supabase.com</li>
            <li>Migrations 001 e 002 no SQL Editor</li>
            <li><code className="text-[13px]">npm run seed</code> para importar médicos</li>
            <li>Criar usuário em Auth + perfil admin em <code className="text-[13px]">profiles</code></li>
          </ol>
        </section>
      </div>
    </div>
  );
}
