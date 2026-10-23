/**
 * Diagnóstico: quais métricas a Meta devolve com o token do médico.
 * Uso: npx tsx scripts/probe-meta-metrics.ts [doctor_id]
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const doctorId = process.argv[2] || 'f3a74ec3-a5f3-4beb-ad01-8d4c48bac24b';

function daysAgo(n: number) {
  const today = new Date();
  const from = new Date(today);
  from.setUTCDate(from.getUTCDate() - n);
  const pad = (x: number) => String(x).padStart(2, '0');
  const ymd = (d: Date) =>
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  return { since: ymd(from), until: ymd(today) };
}

async function metaGet(path: string, token: string) {
  const sep = path.includes('?') ? '&' : '?';
  const url = `https://graph.facebook.com/v22.0/${path}${sep}access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 300) };
  }
  return { ok: res.ok, status: res.status, json };
}

function sumField(rows: Array<Record<string, string>>, field: string) {
  return rows.reduce((s, r) => s + parseFloat(r[field] || '0'), 0);
}

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: tracking, error } = await sb
    .from('doctor_tracking')
    .select('meta_ads_access_token, meta_ads_account_id, meta_access_token')
    .eq('doctor_id', doctorId)
    .single();

  if (error || !tracking) {
    console.error('doctor_tracking não encontrado');
    process.exit(1);
  }

  const adsToken = tracking.meta_ads_access_token?.trim();
  const accountId = tracking.meta_ads_account_id?.replace(/^act_/, '');
  const capiToken = tracking.meta_access_token?.trim();

  if (!adsToken || !accountId) {
    console.error('Falta meta_ads_access_token ou meta_ads_account_id');
    process.exit(1);
  }

  const range = daysAgo(30);
  console.log(`\nMédico: ${doctorId}`);
  console.log(`Período: ${range.since} → ${range.until}\n`);

  // --- Ads account insights (paid) ---
  const adsFields = [
    'spend',
    'impressions',
    'clicks',
    'reach',
    'cpm',
    'cpc',
    'ctr',
    'actions',
    'cost_per_action_type',
  ].join(',');

  const insightsPath =
    `act_${accountId}/insights` +
    `?fields=${adsFields}` +
    `&time_range=${encodeURIComponent(JSON.stringify(range))}` +
    `&level=account` +
    `&time_increment=1` +
    `&limit=100`;

  const ads = await metaGet(insightsPath, adsToken);
  if (!ads.ok) {
    console.log('❌ Ads insights:', ads.status, JSON.stringify(ads.json).slice(0, 400));
  } else {
    const rows = ((ads.json as { data?: Array<Record<string, string>> }).data ||
      []) as Array<Record<string, string>>;
    console.log('✅ Ads insights (conta) — linhas:', rows.length);
    console.log('   Valor investido (spend):', sumField(rows, 'spend').toFixed(2));
    console.log('   Alcance pago (reach):', sumField(rows, 'reach').toFixed(0));
    console.log('   Impressões:', sumField(rows, 'impressions').toFixed(0));
    console.log('   Cliques:', sumField(rows, 'clicks').toFixed(0));

    const actionTotals = new Map<string, number>();
    const costTotals = new Map<string, number>();

    for (const row of rows) {
      const actions = row.actions as unknown;
      if (Array.isArray(actions)) {
        for (const a of actions as Array<{ action_type: string; value: string }>) {
          actionTotals.set(
            a.action_type,
            (actionTotals.get(a.action_type) || 0) + parseFloat(a.value || '0')
          );
        }
      }
      const costs = row.cost_per_action_type as unknown;
      if (Array.isArray(costs)) {
        for (const c of costs as Array<{ action_type: string; value: string }>) {
          costTotals.set(c.action_type, (costTotals.get(c.action_type) || 0) + parseFloat(c.value || '0'));
        }
      }
    }

    const messagingKeys = [...actionTotals.keys()].filter((k) =>
      /messaging|message|conversation|whatsapp/i.test(k)
    );
    if (messagingKeys.length) {
      console.log('\n   Conversas / mensagens (actions):');
      for (const k of messagingKeys) {
        console.log(`     ${k}: ${actionTotals.get(k)?.toFixed(0)}`);
        const cost = [...costTotals.entries()].find(([ck]) => ck === k);
        if (cost) console.log(`     custo/${k}: ${cost[1].toFixed(2)}`);
      }
    } else {
      console.log('\n   ⚠️ Nenhuma action de messaging no período (campanhas podem não ser de mensagem)');
      console.log('   Actions disponíveis:', [...actionTotals.keys()].slice(0, 12).join(', ') || '(vazio)');
    }
  }

  // --- Pages / IG linked to ad account (organic, followers) ---
  const token = adsToken || capiToken!;
  const me = await metaGet('me/accounts?fields=id,name,instagram_business_account', token);
  if (!me.ok) {
    console.log('\n❌ Páginas (me/accounts):', me.status, JSON.stringify(me.json).slice(0, 300));
  } else {
    const pages = ((me.json as { data?: Array<Record<string, string>> }).data || []) as Array<
      Record<string, { id?: string } | string>
    >;
    console.log('\n✅ Páginas ligadas ao token:', pages.length);
    for (const p of pages.slice(0, 5)) {
      const name = p.name as string;
      const pageId = p.id as string;
      const ig = (p.instagram_business_account as { id?: string })?.id;
      console.log(`   - ${name} (page ${pageId})${ig ? ` → IG ${ig}` : ''}`);

      const pageInsights = await metaGet(
        `${pageId}/insights?metric=page_impressions_organic,page_impressions_paid,page_fans&period=day&since=${range.since}&until=${range.until}`,
        token
      );
      if (pageInsights.ok) {
        const metrics = (pageInsights.json as { data?: Array<{ name: string; values: Array<{ value: number }> }> }).data || [];
        for (const m of metrics) {
          const total = m.values?.reduce((s, v) => s + (v.value || 0), 0) || 0;
          console.log(`     ${m.name}: ${total}`);
        }
      } else {
        console.log('     ⚠️ page insights:', pageInsights.status);
      }

      if (ig) {
        const igInsights = await metaGet(
          `${ig}/insights?metric=reach,follower_count,profile_views&period=day&since=${range.since}&until=${range.until}`,
          token
        );
        if (igInsights.ok) {
          const metrics = (igInsights.json as { data?: Array<{ name: string; values: Array<{ value: number }> }> }).data || [];
          for (const m of metrics) {
            const last = m.values?.[m.values.length - 1]?.value;
            const sum = m.values?.reduce((s, v) => s + (v.value || 0), 0) || 0;
            console.log(`     IG ${m.name}: último=${last ?? '—'} soma=${sum}`);
          }
        } else {
          console.log('     ⚠️ IG insights:', igInsights.status, JSON.stringify(igInsights.json).slice(0, 200));
        }
      }
    }
  }

  console.log('\n--- Fim do diagnóstico ---\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
