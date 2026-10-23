import { fmtInt, fmtPct, money } from '@/lib/analytics-format';
import type { MetaCampaignRow } from '@/lib/tracker/types';

interface MetaCampaignsTableProps {
  campaigns: MetaCampaignRow[];
}

export function MetaCampaignsTable({ campaigns }: MetaCampaignsTableProps) {
  if (!campaigns.length) {
    return (
      <p className="py-6 text-center text-[13px] text-[var(--brand-text-tertiary)]">
        Nenhuma campanha no período. Rode o sync com credenciais Meta do médico.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--brand-border)]">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-[var(--brand-border)] bg-[var(--brand-muted-surface)] text-left text-[11px] uppercase tracking-wider text-[var(--brand-text-secondary)]">
            <th className="px-3 py-2.5">Campanha</th>
            <th className="px-3 py-2.5 text-right">Investido</th>
            <th className="px-3 py-2.5 text-right">Impressões</th>
            <th className="px-3 py-2.5 text-right">Cliques</th>
            <th className="px-3 py-2.5 text-right">CTR</th>
            <th className="px-3 py-2.5 text-right">Mensagens</th>
            <th className="px-3 py-2.5 text-right">Custo/msg</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => (
            <tr
              key={c.campaign_id}
              className="border-b border-[var(--brand-border)] last:border-0"
            >
              <td className="max-w-[220px] truncate px-3 py-2.5 font-medium">
                {c.campaign_name}
              </td>
              <td className="mono px-3 py-2.5 text-right dash-accent-amber">
                {money(c.spend)}
              </td>
              <td className="mono px-3 py-2.5 text-right">
                {fmtInt(c.impressions)}
              </td>
              <td className="mono px-3 py-2.5 text-right">{fmtInt(c.clicks)}</td>
              <td className="mono px-3 py-2.5 text-right">
                {fmtPct(c.ctr)}
              </td>
              <td className="mono px-3 py-2.5 text-right">
                {fmtInt(c.messaging)}
              </td>
              <td className="mono px-3 py-2.5 text-right">
                {c.cpl != null ? money(c.cpl) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
