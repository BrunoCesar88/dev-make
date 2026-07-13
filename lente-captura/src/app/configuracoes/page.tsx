export default function ConfiguracoesPage() {
  const webhookBase =
    process.env.NEXT_PUBLIC_APP_URL || 'https://seu-dominio.vercel.app';

  return (
    <div className="px-8 py-10 lg:px-12">
      <header className="mb-10">
        <h1 className="text-[40px] font-semibold tracking-tight text-[#1d1d1f]">
          Configurações
        </h1>
        <p className="mt-1 text-[17px] text-[#86868b]">
          Variáveis e instruções de setup
        </p>
      </header>

      <div className="max-w-2xl space-y-6">
        <section className="apple-card p-6 lg:p-8">
          <h2 className="mb-3 text-[21px] font-semibold text-[#1d1d1f]">Webhook Uazapi</h2>
          <p className="mb-3 text-[15px] text-[#6e6e73]">
            URL base para configurar em cada instância:
          </p>
          <code className="block rounded-xl bg-[#f5f5f7] p-4 text-[13px] break-all text-[#1d1d1f]">
            {webhookBase}/api/webhook/uazapi?instance=INSTANCE
          </code>
        </section>

        <section className="apple-card p-6 lg:p-8">
          <h2 className="mb-3 text-[21px] font-semibold text-[#1d1d1f]">Google Sheets</h2>
          <ol className="list-decimal space-y-2 pl-5 text-[15px] text-[#6e6e73]">
            <li>Crie uma Service Account no Google Cloud Console</li>
            <li>Ative a Google Sheets API</li>
            <li>Baixe a chave JSON e configure as variáveis de ambiente</li>
            <li>Compartilhe cada planilha com o e-mail da service account (Editor)</li>
          </ol>
        </section>

        <section className="apple-card p-6 lg:p-8">
          <h2 className="mb-3 text-[21px] font-semibold text-[#1d1d1f]">Supabase</h2>
          <ol className="list-decimal space-y-2 pl-5 text-[15px] text-[#6e6e73]">
            <li>Projeto em supabase.com</li>
            <li>Migrations 001 e 002 no SQL Editor</li>
            <li><code className="text-[13px]">npm run seed</code> para importar médicos</li>
            <li>Variáveis NEXT_PUBLIC_SUPABASE_* no .env.local</li>
          </ol>
        </section>
      </div>
    </div>
  );
}
