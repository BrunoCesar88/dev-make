import { BarChart3 } from 'lucide-react';

export function AnalyticsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--brand-border)] bg-[var(--brand-muted-surface)] px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-surface)] text-[var(--brand-text-tertiary)]">
        <BarChart3 className="h-7 w-7" />
      </div>
      <h2 className="text-[18px] font-semibold text-[var(--brand-text)]">
        Nenhum relatório gerado
      </h2>
      <p className="mt-2 max-w-md text-[14px] text-[var(--brand-text-tertiary)]">
        Selecione o médico e o período acima, depois clique em{' '}
        <strong className="text-[var(--brand-text-secondary)]">Gerar métricas</strong>{' '}
        para carregar leads do WhatsApp e dados da Meta Ads.
      </p>
    </div>
  );
}
