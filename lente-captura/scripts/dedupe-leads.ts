#!/usr/bin/env npx tsx
/**
 * Remove leads duplicados (mesmo médico + mesmo telefone).
 * Usage: npm run dedupe:leads
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { countDuplicateLeads, dedupeLeads } from '../src/lib/leads/dedupe';

config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('🔍 Verificando duplicatas...\n');

  const before = await countDuplicateLeads(supabase);
  const { removed, normalized } = await dedupeLeads(supabase);
  const after = await countDuplicateLeads(supabase);

  const { count } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true });

  if (removed === 0) {
    console.log(`✅ Nenhuma duplicata. ${count} leads no total.`);
    return;
  }

  console.log(`🗑️  Removidas: ${removed}`);
  if (normalized) console.log(`📞 Telefones normalizados: ${normalized}`);
  console.log(`✅ Restam ${count} leads · duplicatas: ${after}`);
}

main().catch((err) => {
  console.error('❌', err instanceof Error ? err.message : err);
  process.exit(1);
});
