#!/usr/bin/env tsx
/**
 * Importa frases da exportação Lente-Medicos (CSV) para doctors.bio_phrase etc.
 *
 * Uso:
 *   npx tsx scripts/import-lente-medicos-phrases.ts "/path/Lente-Medicos_rows.csv"
 */

import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { isPlaceholderPhrase } from '../src/lib/leads/manychat-triggers';
import { instanceNameToTenantSlug } from '../src/lib/tracker/tenant';

config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

function normalizeInstanceName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').replace(/\s*-\s*/g, '-');
}

/** CSV usa nomes antigos; Captura usa o nome canônico da instância. */
const INSTANCE_ALIASES: Record<string, string> = {
  'dra-sean-lai': 'dr-sean-lai',
};

function resolveInstanceKey(raw: string): string {
  const normalized = normalizeInstanceName(raw).toLowerCase();
  return INSTANCE_ALIASES[normalized] || normalized;
}

function extractSpreadsheetId(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match?.[1] ?? null;
}

function cleanPhone(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  const digits = value.replace('@s.whatsapp.net', '').replace(/\D/g, '');
  if (!digits) return null;
  return digits.startsWith('55') ? digits : `55${digits}`;
}

function parseCsv(content: string): Array<Record<string, string>> {
  const rows: Array<Record<string, string>> = [];
  let i = 0;
  const len = content.length;

  const readField = (): string | null => {
    if (i >= len) return null;
    let field = '';
    if (content[i] === '"') {
      i++;
      while (i < len) {
        if (content[i] === '"') {
          if (content[i + 1] === '"') {
            field += '"';
            i += 2;
          } else {
            i++;
            break;
          }
        } else {
          field += content[i++];
        }
      }
      if (content[i] === ',') i++;
      return field;
    }
    while (i < len && content[i] !== ',' && content[i] !== '\n' && content[i] !== '\r') {
      field += content[i++];
    }
    if (content[i] === ',') i++;
    return field;
  };

  const headers: string[] = [];
  while (true) {
    const field = readField();
    if (field === null) break;
    headers.push(field);
    if (content[i - 1] !== ',' && (content[i] === '\n' || content[i] === '\r')) {
      if (content[i] === '\r') i++;
      if (content[i] === '\n') i++;
      break;
    }
  }

  while (i < len) {
    const row: Record<string, string> = {};
    let col = 0;
    while (col < headers.length) {
      const field = readField();
      if (field === null) break;
      row[headers[col]] = field;
      col++;
      if (content[i - 1] !== ',' && (content[i] === '\n' || content[i] === '\r' || i >= len)) {
        if (content[i] === '\r') i++;
        if (content[i] === '\n') i++;
        break;
      }
    }
    if (Object.keys(row).length) rows.push(row);
  }

  return rows;
}

function cleanPhrase(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.replace(/\u2060/g, '').trim();
  return isPlaceholderPhrase(trimmed) ? null : trimmed;
}

async function main() {
  const csvPath =
    process.argv[2] ||
    path.join(process.env.HOME || '', 'Downloads/Lente-Medicos_rows.csv');

  if (!fs.existsSync(csvPath)) {
    console.error(`Arquivo não encontrado: ${csvPath}`);
    process.exit(1);
  }

  const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));
  const { data: doctors, error } = await supabase
    .from('doctors')
    .select('id, instance_name');

  if (error || !doctors) {
    console.error('Erro ao listar doctors:', error?.message);
    process.exit(1);
  }

  const byInstance = new Map(
    doctors.map((d) => [normalizeInstanceName(d.instance_name).toLowerCase(), d])
  );

  let updated = 0;
  let missing = 0;
  let created = 0;

  for (const row of rows) {
    const csvInstance = row['Name Instance'] || '';
    const instanceKey = resolveInstanceKey(csvInstance);
    if (!instanceKey) continue;

    let doctor = byInstance.get(instanceKey);

    if (!doctor) {
      const planilha = row.Planilha?.replace(/\n/g, '').trim() || null;
      const { data: inserted, error: insertError } = await supabase
        .from('doctors')
        .insert({
          name: (row.Medico || csvInstance).trim(),
          instance_name: normalizeInstanceName(csvInstance),
          tenant_slug: instanceNameToTenantSlug(normalizeInstanceName(csvInstance)),
          phone: cleanPhone(row.Numero),
          spreadsheet_url: planilha,
          spreadsheet_id: extractSpreadsheetId(planilha),
          sheet_gid: row.Aba?.replace('gid=', '') || '0',
          status: 'active',
          lead_enabled: true,
          api_provider: 'uazapi',
        })
        .select('id, instance_name')
        .single();

      if (insertError || !inserted) {
        console.warn(`⚠ Sem match e falha ao criar ${csvInstance}: ${insertError?.message}`);
        missing++;
        continue;
      }

      doctor = inserted;
      byInstance.set(
        normalizeInstanceName(inserted.instance_name).toLowerCase(),
        inserted
      );
      console.log(`+ Criado no Captura: ${inserted.instance_name}`);
      created++;
    }

    const payload = {
      bio_phrase: cleanPhrase(row['Frase Bio']),
      site_phrase: cleanPhrase(row['Frase Site']),
      manychat_phrase: cleanPhrase(row.Manychat),
      social_selling_phrase: cleanPhrase(row.Social_Selling),
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from('doctors')
      .update(payload)
      .eq('id', doctor.id);

    if (updateError) {
      console.error(`✗ ${row['Name Instance']}: ${updateError.message}`);
      continue;
    }

    console.log(`✓ ${row['Name Instance']}`);
    updated++;
  }

  console.log(`\nConcluído: ${updated} atualizados, ${created} criados, ${missing} sem match.`);
  console.log('Rode a migration 007 no Supabase antes se as colunas ainda não existirem.');
}

main();
