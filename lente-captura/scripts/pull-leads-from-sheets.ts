#!/usr/bin/env npx tsx
/**
 * Puxa leads de todas as planilhas dos médicos ativos
 * Usage: npm run pull:leads
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';
import { pullLeadsForAllDoctors } from '../src/lib/google-sheets/pull-from-sheet';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const full = process.argv.includes('--full');
  console.log(
    full
      ? '📥 Reimportando todas as planilhas (com origens)...\n'
      : '📥 Puxando leads das planilhas...\n'
  );

  const result = await pullLeadsForAllDoctors(supabase, {
    mode: full ? 'full' : 'incremental',
  });

  console.log(`✅ Médicos processados: ${result.doctors}`);
  console.log(`📄 Linhas na planilha: ${result.totalRows}`);
  console.log(`🆕 Novos leads: ${result.imported}`);
  console.log(`♻️  Atualizados: ${result.updated}`);
  if (result.skipped) console.log(`⏭️  Ignorados: ${result.skipped}`);

  if (result.errors.length) {
    console.log(`\n⚠️ Erros (${result.errors.length}):`);
    for (const item of result.errors) {
      console.log(`   - ${item.doctor}: ${item.error}`);
    }
  }
}

main().catch((err) => {
  console.error('❌', err instanceof Error ? err.message : err);
  process.exit(1);
});
