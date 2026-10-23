import { DashArea, DashBadge, DashKpi } from '@/components/dash-area';
import { DeliveryStatus } from '@/components/analytics/delivery-status';
import { MetaAdsDashboard } from '@/components/analytics/meta-ads-dashboard';
import { ProductsChart } from '@/components/analytics/products-chart';
import { RevenueChart } from '@/components/analytics/revenue-chart';
import {
  fmtDate,
  fmtInt,
  fmtPct,
  leadCountFromSummary,
  money,
} from '@/lib/analytics-format';
import type { AnalyticsPeriod } from '@/lib/analytics-period';
import { periodLabel } from '@/lib/analytics-period';
import type { TrackerAnalyticsBundle } from '@/lib/tracker/types';

interface AnalyticsDashboardProps {
  data: TrackerAnalyticsBundle;
  period: AnalyticsPeriod;
  doctorLabel: string | null;
}

export function AnalyticsDashboard({
  data,
  period,
  doctorLabel,
}: AnalyticsDashboardProps) {
  const periodText = periodLabel(period);
  const leadCount = leadCountFromSummary(
    data.leads?.summary,
    data.leads?.leads.length ?? 0
  );
  const hasSales = (data.revenue?.sales ?? 0) > 0;

  return (
    <div className="space-y-8">
      {data.error && (
        <div className="rounded-xl border border-[var(--accent-red)]/30 bg-[var(--accent-red)]/10 px-4 py-3 text-[13px] text-[var(--brand-text)]">
          {data.error}
        </div>
      )}

      <DashArea
        icon="📊"
        title="Resumo"
        subtitle={`${periodText}${doctorLabel ? ` · ${doctorLabel}` : ''}`}
        badge={<DashBadge variant="db">Fonte: Supabase</DashBadge>}
      >
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <DashKpi
            label="Leads WhatsApp"
            value={fmtInt(leadCount)}
            sub="No período selecionado"
            accent="green"
          />
          {hasSales ? (
            <>
              <DashKpi
                label="Receita bruta"
                value={money(data.revenue!.gross, data.revenue!.currency)}
                accent="amber"
              />
              <DashKpi
                label="Vendas"
                value={fmtInt(data.revenue!.sales)}
                sub="Transações pagas"
              />
              <DashKpi
                label="Ticket médio"
                value={money(data.revenue!.aov, data.revenue!.currency)}
                accent="blue"
              />
            </>
          ) : null}
        </div>
      </DashArea>

      {hasSales && data.revenue && (
        <DashArea
          icon="💰"
          title="Vendas & Receita"
          subtitle="Compras gravadas no banco de dados"
          badge={<DashBadge variant="db">purchase_log</DashBadge>}
        >
          <div className="space-y-6">
            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-text-secondary)]">
                Receita ao longo do tempo
              </div>
              <RevenueChart series={data.revenue.time_series || []} />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_1fr]">
              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-text-secondary)]">
                  Produtos
                </div>
                {!data.products?.products?.length ? (
                  <p className="text-[13px] text-[var(--brand-text-tertiary)]">
                    Nenhum produto ainda.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {data.products.products.map((product) => (
                      <div
                        key={product.product_id}
                        className="rounded-lg border border-[var(--brand-border)] p-3"
                      >
                        <div className="truncate text-[12px] text-[var(--brand-text-tertiary)]">
                          {product.product_name || product.product_id}
                        </div>
                        <div className="mt-1 flex items-baseline justify-between">
                          <div className="mono text-lg dash-accent-amber">
                            {money(product.revenue, product.currency || 'BRL')}
                          </div>
                          <div className="mono text-[12px] text-[var(--brand-text-secondary)]">
                            {fmtInt(product.sales)} vendas
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-text-secondary)]">
                  Vendas por produto no tempo
                </div>
                <ProductsChart series={data.products?.time_series || []} />
              </div>
            </div>

            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-text-secondary)]">
                Compras recentes
              </div>
              {!data.purchases?.rows?.length ? (
                <p className="text-[13px] text-[var(--brand-text-tertiary)]">
                  Nenhuma compra ainda.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-[var(--brand-border)] text-left text-[11px] uppercase tracking-wider text-[var(--brand-text-secondary)]">
                        <th className="py-2 pr-3">Quando</th>
                        <th className="py-2 pr-3">E-mail</th>
                        <th className="py-2 pr-3">Produto</th>
                        <th className="py-2 pr-3 text-right">Valor</th>
                        <th className="py-2 pr-3 text-center">Meta</th>
                        <th className="py-2 pr-3 text-center">GA4</th>
                        <th className="py-2 text-center">Google Ads</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.purchases.rows.map((purchase, index) => (
                        <tr
                          key={`${purchase.created_at}-${index}`}
                          className="border-b border-[var(--brand-border)] last:border-0"
                        >
                          <td className="py-2 pr-3 text-[var(--brand-text-secondary)]">
                            {fmtDate(purchase.created_at)}
                          </td>
                          <td className="mono py-2 pr-3">
                            {purchase.raw_email || '—'}
                          </td>
                          <td className="py-2 pr-3">
                            {purchase.product_name || purchase.product_id || '—'}
                          </td>
                          <td className="mono py-2 pr-3 text-right dash-accent-amber">
                            {money(purchase.value, purchase.currency || 'BRL')}
                          </td>
                          <td className="py-2 pr-3 text-center">
                            <DeliveryStatus ok={purchase.meta_response_ok} />
                          </td>
                          <td className="py-2 pr-3 text-center">
                            <DeliveryStatus ok={purchase.ga4_response_ok} />
                          </td>
                          <td className="py-2 text-center">
                            <DeliveryStatus
                              ok={purchase.google_ads_response_ok}
                              skippedBody={purchase.google_ads_response_body}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </DashArea>
      )}

      {data.leads && (
        <DashArea
          icon="🧲"
          title="Leads WhatsApp"
          subtitle="Entradas reais no sistema, classificadas por origem (anúncio, bio, site…)"
          badge={<DashBadge variant="neutral">Supabase · leads</DashBadge>}
        >
          {!data.leads.leads.length ? (
            <p className="text-[13px] text-[var(--brand-text-tertiary)]">
              Nenhum lead no período
            </p>
          ) : (
            <div className="max-h-[min(420px,55vh)] overflow-auto rounded-lg border border-[var(--brand-border)]">
              <table className="w-full text-[13px]">
                <thead className="sticky top-0 z-10 bg-[var(--brand-surface)] shadow-[0_1px_0_var(--brand-border)]">
                  <tr className="border-b border-[var(--brand-border)] text-left text-[11px] uppercase tracking-wider text-[var(--brand-text-secondary)]">
                    <th className="py-2 pl-3 pr-3">Quando</th>
                    <th className="py-2 pr-3">Nome</th>
                    <th className="py-2 pr-3">Telefone</th>
                    <th className="py-2 pr-3">Origem</th>
                    <th className="py-2 pr-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.leads.leads.map((lead) => (
                    <tr
                      key={lead.event_id}
                      className="border-b border-[var(--brand-border)] last:border-0"
                    >
                      <td className="py-2 pl-3 pr-3 text-[var(--brand-text-secondary)]">
                        {fmtDate(lead.timestamp)}
                      </td>
                      <td className="py-2 pr-3">{lead.patient_name || '—'}</td>
                      <td className="mono py-2 pr-3">{lead.patient_phone || '—'}</td>
                      <td className="py-2 pr-3">{lead.origem || '(sem origem)'}</td>
                      <td className="py-2 pr-3 text-[var(--brand-text-secondary)]">
                        {lead.status || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DashArea>
      )}

      {data.attribution && (
        <MetaAdsDashboard
          attribution={data.attribution}
          periodText={periodText}
          doctorLabel={doctorLabel}
        />
      )}

      {data.attribution && (
        <DashArea
          icon="🔍"
          title="Google Ads"
          subtitle="Métricas do gestor — sync da Google Ads API cruzado com leads WhatsApp"
          badge={<DashBadge variant="cross">Google Ads API</DashBadge>}
        >
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <DashKpi
              compact
              label="Valor investido"
              value={
                data.attribution.google_spend > 0
                  ? money(data.attribution.google_spend)
                  : '—'
              }
              accent="amber"
            />
            <DashKpi
              compact
              label="Impressões"
              value={fmtInt(data.attribution.google_impressions)}
            />
            <DashKpi
              compact
              label="Cliques"
              value={fmtInt(data.attribution.google_clicks)}
            />
            <DashKpi
              compact
              label="CTR"
              value={fmtPct(data.attribution.google_ctr)}
              sub="Cliques ÷ impressões"
            />
            <DashKpi
              compact
              label="CPC"
              value={
                data.attribution.google_cpc != null
                  ? money(data.attribution.google_cpc)
                  : '—'
              }
              sub="Investido ÷ cliques"
            />
            <DashKpi
              compact
              label="CPL"
              value={
                data.attribution.google_cpl != null
                  ? money(data.attribution.google_cpl)
                  : '—'
              }
              sub="Investido ÷ leads"
              accent="green"
            />
            <DashKpi
              compact
              label="Leads WhatsApp"
              value={fmtInt(data.attribution.google_leads)}
              sub="Origem GOOGLE"
            />
            <DashKpi
              compact
              label="CPA SUCESSO"
              value={
                data.attribution.google_cpa_sucesso != null
                  ? money(data.attribution.google_cpa_sucesso)
                  : '—'
              }
              sub="Investido ÷ leads com status SUCESSO"
              accent="blue"
            />
          </div>
        </DashArea>
      )}
    </div>
  );
}
