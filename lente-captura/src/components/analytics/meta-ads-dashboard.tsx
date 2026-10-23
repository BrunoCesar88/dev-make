import { DashArea, DashBadge, DashKpi } from '@/components/dash-area';
import { MetaCampaignsTable } from '@/components/analytics/meta-campaigns-table';
import { MetaFunnel } from '@/components/analytics/meta-funnel';
import { MetaTimelineChart } from '@/components/analytics/meta-timeline-chart';
import { fmtInt, fmtPct, money } from '@/lib/analytics-format';
import type { TrackerAttribution } from '@/lib/tracker/types';

interface MetaAdsDashboardProps {
  attribution: TrackerAttribution;
  periodText: string;
  doctorLabel: string | null;
}

export function MetaAdsDashboard({
  attribution,
  periodText,
  doctorLabel,
}: MetaAdsDashboardProps) {
  const resultValue =
    attribution.meta_messaging_conversations > 0
      ? attribution.meta_messaging_conversations
      : attribution.meta_leads;
  const resultLabel =
    attribution.meta_messaging_conversations > 0
      ? 'Mensagens'
      : 'Leads WhatsApp';
  const costPerResult =
    attribution.meta_messaging_conversations > 0
      ? attribution.meta_cost_per_message
      : attribution.meta_cpl;

  return (
    <DashArea
      icon="🎯"
      title="Meta Ads"
      subtitle={`${periodText}${doctorLabel ? ` · ${doctorLabel}` : ''} — sync da Meta cruzado com leads WhatsApp`}
      badge={<DashBadge variant="cross">Meta Marketing API</DashBadge>}
    >
      <div className="space-y-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          <DashKpi
            compact
            label="Investimento"
            value={
              attribution.meta_spend > 0
                ? money(attribution.meta_spend)
                : '—'
            }
            accent="amber"
          />
          <DashKpi
            compact
            label="Resultado"
            value={fmtInt(resultValue)}
            sub={resultLabel}
            accent="blue"
          />
          <DashKpi
            compact
            label="Custo / resultado"
            value={costPerResult != null ? money(costPerResult) : '—'}
            sub={
              attribution.meta_messaging_conversations > 0
                ? 'Investido ÷ mensagens'
                : 'Investido ÷ leads'
            }
          />
          <DashKpi
            compact
            label="CPM"
            value={
              attribution.meta_cpm != null ? money(attribution.meta_cpm) : '—'
            }
            sub="Por mil impressões"
          />
          <DashKpi
            compact
            label="CTR"
            value={fmtPct(attribution.meta_ctr)}
            sub="Cliques ÷ impressões"
          />
          <DashKpi
            compact
            label="CPL"
            value={
              attribution.meta_cpl != null ? money(attribution.meta_cpl) : '—'
            }
            sub="Investido ÷ leads"
            accent="green"
          />
          <DashKpi
            compact
            label="CPA SUCESSO"
            value={
              attribution.meta_cpa_sucesso != null
                ? money(attribution.meta_cpa_sucesso)
                : '—'
            }
            sub={`${fmtInt(attribution.meta_leads_sucesso)} sucessos`}
            accent="blue"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
          <div>
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-text-secondary)]">
              Linha do tempo
            </div>
            <div className="dash-card p-4">
              <MetaTimelineChart series={attribution.meta_time_series} />
            </div>
          </div>
          <div>
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-text-secondary)]">
              Funil geral
            </div>
            <div className="dash-card p-4">
              <MetaFunnel stages={attribution.meta_funnel} />
            </div>
          </div>
        </div>

        <div>
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-text-secondary)]">
            Visão geral campanha
          </div>
          <MetaCampaignsTable campaigns={attribution.meta_campaigns} />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <DashKpi
            compact
            label="Alcance pago"
            value={fmtInt(attribution.meta_reach)}
          />
          <DashKpi
            compact
            label="Frequência"
            value={
              attribution.meta_frequency != null
                ? attribution.meta_frequency.toFixed(2)
                : '—'
            }
            sub="Impressões ÷ alcance"
          />
          <DashKpi
            compact
            label="Alcance orgânico"
            value={fmtInt(attribution.meta_organic_reach)}
            accent="green"
          />
          <DashKpi
            compact
            label="Seguidores IG"
            value={
              attribution.meta_ig_followers_total != null
                ? fmtInt(attribution.meta_ig_followers_total)
                : '—'
            }
            sub={`+${fmtInt(attribution.meta_new_followers)} no período`}
          />
        </div>
      </div>
    </DashArea>
  );
}
