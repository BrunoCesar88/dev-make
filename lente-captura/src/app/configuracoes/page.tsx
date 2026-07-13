export default function ConfiguracoesPage() {
  const webhookBase =
    process.env.NEXT_PUBLIC_APP_URL || 'https://seu-dominio.vercel.app';

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
        <p className="text-slate-500">Variáveis e instruções de setup</p>
      </div>

      <div className="max-w-2xl space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-3 font-semibold">Webhook Uazapi</h2>
          <p className="mb-2 text-sm text-slate-600">
            URL base para configurar em cada instância (substitua INSTANCE pelo nome):
          </p>
          <code className="block rounded-lg bg-slate-100 p-3 text-xs break-all">
            {webhookBase}/api/webhook/uazapi?instance=INSTANCE
          </code>
          <p className="mt-2 text-xs text-slate-500">
            Exemplo: {webhookBase}/api/webhook/uazapi?instance=Dra-Bruna-Lenz
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-3 font-semibold">Google Sheets</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-600">
            <li>Crie uma Service Account no Google Cloud Console</li>
            <li>Ative a Google Sheets API</li>
            <li>Baixe a chave JSON e configure as variáveis de ambiente</li>
            <li>Compartilhe cada planilha de médico com o e-mail da service account (Editor)</li>
          </ol>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-3 font-semibold">Supabase</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-600">
            <li>Crie projeto em supabase.com</li>
            <li>Execute a migration em <code>supabase/migrations/001_initial_schema.sql</code></li>
            <li>Execute <code>npm run seed</code> para importar os 34 médicos</li>
            <li>Configure as variáveis NEXT_PUBLIC_SUPABASE_* e SUPABASE_SERVICE_ROLE_KEY</li>
          </ol>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-3 font-semibold">Próximas fases</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
            <li>Login por médico (portal self-service)</li>
            <li>Alertas por e-mail quando conexão cair</li>
            <li>Dashboard por gestor (Alison, Klaus, Soraya)</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
