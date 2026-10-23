import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { fetchMetaSocialMetrics } from '../src/lib/meta-ads/fetch-social';

config({ path: '.env.local' });

async function metaGet(path: string, token: string) {
  const url = `https://graph.facebook.com/v22.0/${path}${path.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(token)}`;
  const r = await fetch(url);
  return { status: r.status, json: await r.json() };
}

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await sb
    .from('doctor_tracking')
    .select('meta_ads_access_token, meta_access_token')
    .eq('doctor_id', 'f3a74ec3-a5f3-4beb-ad01-8d4c48bac24b')
    .single();

  const ads = data?.meta_ads_access_token?.trim() || '';
  const capi = data?.meta_access_token?.trim() || '';
  const igId = '17841401762140732';

  for (const [label, token] of [
    ['ads', ads],
    ['capi', capi],
  ] as const) {
    console.log('\n--- token', label, '---');
    const profile = await metaGet(`${igId}?fields=username,followers_count`, token);
    console.log('ig profile:', profile.status, JSON.stringify(profile.json).slice(0, 200));
  }

  const social = await fetchMetaSocialMetrics(ads, '2026-07-01', '2026-07-23');
  console.log('\nfetchMetaSocialMetrics:', JSON.stringify(social, null, 2));
}

main();
