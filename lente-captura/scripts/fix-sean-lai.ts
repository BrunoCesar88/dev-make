#!/usr/bin/env npx tsx
/**
 * Corrige duplicata Dra-Sean-Lai → Dr-Sean-Lai
 * Usage: npm run fix:sean-lai
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';
import { UazapiClient } from '../src/lib/uazapi/client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const baseUrl = process.env.UAZAPI_BASE_URL || 'https://lente.uazapi.com';
const WRONG_INSTANCE = 'Dra-Sean-Lai';
const CORRECT_INSTANCE = 'Dr-Sean-Lai';

async function main() {
  const { data: wrong } = await supabase
    .from('doctors')
    .select('id, name')
    .eq('instance_name', WRONG_INSTANCE)
    .maybeSingle();

  const { data: right } = await supabase
    .from('doctors')
    .select('id, name')
    .eq('instance_name', CORRECT_INSTANCE)
    .single();

  if (!right) {
    console.error('❌ Dr-Sean-Lai não encontrado no banco. Rode npm run seed primeiro.');
    process.exit(1);
  }

  const { data: wrongInstance } = wrong
    ? await supabase
        .from('instances')
        .select('uazapi_token, connection_status')
        .eq('doctor_id', wrong.id)
        .single()
    : { data: null };

  const token = wrongInstance?.uazapi_token;

  if (token) {
    const client = new UazapiClient(baseUrl, token);
    try {
      await client.updateInstanceName(CORRECT_INSTANCE);
      console.log('✅ Uazapi renomeada para Dr-Sean-Lai');
    } catch (err) {
      console.warn(
        '⚠️ Renomear na Uazapi falhou (renomeie manualmente no painel):',
        err instanceof Error ? err.message : err
      );
    }

    await supabase
      .from('instances')
      .update({
        uazapi_token: token,
        uazapi_base_url: baseUrl,
        connection_status: wrongInstance?.connection_status || 'connected',
        last_status_check: new Date().toISOString(),
      })
      .eq('doctor_id', right.id);

    console.log('✅ Token Uazapi movido para Dr. Sean Lai');
  } else {
    console.log('ℹ️ Sem token na duplicata — só ajustando banco');
  }

  if (wrong) {
    await supabase.from('doctors').delete().eq('id', wrong.id);
    console.log('✅ Removida duplicata Dra-Sean-Lai');
  } else {
    console.log('ℹ️ Duplicata Dra-Sean-Lai já não existe no banco');
  }

  await supabase
    .from('doctors')
    .update({ name: 'Dr. Sean Lai' })
    .eq('id', right.id);

  console.log('✅ Pronto. Atualize a página Médicos.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
