import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { syncMetaAdsForPeriod } from '../src/lib/meta-ads/sync';

config({ path: '.env.local' });

const doctorId = process.argv[2] || 'f3a74ec3-a5f3-4beb-ad01-8d4c48bac24b';
const dateFrom = process.argv[3] || '2026-06-01';
const dateTo = process.argv[4] || '2026-07-23';

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const result = await syncMetaAdsForPeriod(sb, {
    dateFrom,
    dateTo,
    doctorId,
  });

  console.log(JSON.stringify(result, null, 2));

  const { count } = await sb
    .from('tracking_ad_spend')
    .select('id', { count: 'exact', head: true })
    .eq('doctor_id', doctorId);

  console.log('rows in tracking_ad_spend:', count);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
