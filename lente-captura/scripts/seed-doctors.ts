#!/usr/bin/env npx tsx
/**
 * Seed script: importa médicos da planilha de controle (data/active-doctors.json)
 * Usage: npm run seed
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import type { SeedDoctor } from '../src/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
  const seedPath = resolve(__dirname, '../data/active-doctors.json');
  const doctors = JSON.parse(readFileSync(seedPath, 'utf-8')) as SeedDoctor[];

  console.log(`📋 Importando ${doctors.length} médicos...`);

  const statusCounts = { active: 0, inactive: 0, pending: 0 };

  // Gestores
  const managerNames = [...new Set(doctors.map((d) => d.manager).filter(Boolean))] as string[];
  const managerMap = new Map<string, string>();

  for (const name of managerNames) {
    const { data, error } = await supabase
      .from('managers')
      .upsert({ name }, { onConflict: 'name' })
      .select('id, name')
      .single();

    if (error) {
      const { data: existing } = await supabase
        .from('managers')
        .select('id, name')
        .eq('name', name)
        .single();
      if (existing) managerMap.set(name, existing.id);
    } else if (data) {
      managerMap.set(name, data.id);
    }
  }

  let created = 0;
  let updated = 0;

  for (const doc of doctors) {
    const managerId = doc.manager ? managerMap.get(doc.manager) : null;

    const status = doc.status || 'active';
    const apiProvider = doc.api === 'evoapi' ? 'evoapi' : 'uazapi';

    const doctorRow = {
      instance_name: doc.instance_name,
      name: doc.name,
      phone: doc.phone,
      manager_id: managerId,
      spreadsheet_id: doc.spreadsheet_id,
      spreadsheet_url: doc.spreadsheet_url,
      sheet_gid: doc.sheet_gid?.replace('gid=', '') || '0',
      bio_link: doc.bio_link,
      lead_enabled: doc.lead_enabled,
      status,
      api_provider: apiProvider,
    };

    statusCounts[status as keyof typeof statusCounts]++;

    const { data: existing } = await supabase
      .from('doctors')
      .select('id')
      .eq('instance_name', doc.instance_name)
      .single();

    let doctorId: string;

    if (existing) {
      await supabase.from('doctors').update(doctorRow).eq('id', existing.id);
      doctorId = existing.id;
      updated++;
    } else {
      const { data: inserted, error } = await supabase
        .from('doctors')
        .insert(doctorRow)
        .select('id')
        .single();

      if (error) {
        console.error(`❌ ${doc.name}:`, error.message);
        continue;
      }
      doctorId = inserted!.id;
      created++;
    }

    // Criar instância vazia se não existir
    const { data: existingInstance } = await supabase
      .from('instances')
      .select('id')
      .eq('doctor_id', doctorId)
      .single();

    if (!existingInstance) {
      await supabase.from('instances').insert({
        doctor_id: doctorId,
        uazapi_base_url: process.env.UAZAPI_BASE_URL || 'https://free.uazapi.com',
        connection_status: 'disconnected',
      });
    }
  }

  console.log(`✅ Concluído: ${created} criados, ${updated} atualizados`);
  console.log(`📊 Status: ${statusCounts.active} ativos, ${statusCounts.inactive} inativos, ${statusCounts.pending} pendentes`);
  console.log(`👥 Gestores: ${managerNames.join(', ')}`);
}

main().catch(console.error);
