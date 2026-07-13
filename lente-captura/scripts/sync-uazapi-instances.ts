#!/usr/bin/env npx tsx
/**
 * Sync existing Uazapi instances into Supabase
 * Does NOT disconnect or require new QR scan — only imports tokens + status
 *
 * Usage:
 *   UAZAPI_ADMIN_TOKEN=xxx npm run sync:uazapi
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';
import { UazapiAdminClient } from '../src/lib/uazapi/admin-client';
import { UazapiClient, normalizeConnectionStatus } from '../src/lib/uazapi/client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const baseUrl = process.env.UAZAPI_BASE_URL || 'https://free.uazapi.com';
const adminToken = process.env.UAZAPI_ADMIN_TOKEN;
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const configureWebhooks = process.env.SYNC_CONFIGURE_WEBHOOKS === 'true';

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (!adminToken) {
  console.error('❌ Configure UAZAPI_ADMIN_TOKEN no .env.local');
  console.error('   Encontre em: painel Uazapi → Admin Token');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '-');
}

async function main() {
  console.log(`🔄 Buscando instâncias em ${baseUrl}...`);

  const admin = new UazapiAdminClient(baseUrl, adminToken!);
  const remoteInstances = await admin.listAllInstances();

  console.log(`📡 ${remoteInstances.length} instâncias encontradas na Uazapi`);

  const { data: doctors, error } = await supabase
    .from('doctors')
    .select('id, instance_name, name');

  if (error || !doctors) {
    console.error('❌ Erro ao buscar médicos:', error?.message);
    process.exit(1);
  }

  const doctorByName = new Map(
    doctors.map((d) => [normalizeName(d.instance_name), d])
  );

  let matched = 0;
  let connected = 0;
  let webhooks = 0;
  const unmatched: string[] = [];

  for (const remote of remoteInstances) {
    const instanceName = admin.getInstanceName(remote);
    const token = admin.getInstanceToken(remote);

    if (!instanceName) {
      console.warn('⚠️ Instância sem nome, ignorada:', JSON.stringify(remote).slice(0, 120));
      continue;
    }

    if (!token) {
      console.warn(`⚠️ ${instanceName} sem token, ignorada`);
      unmatched.push(`${instanceName} (sem token)`);
      continue;
    }

    const doctor = doctorByName.get(normalizeName(instanceName));
    if (!doctor) {
      unmatched.push(instanceName);
      continue;
    }

    // Fetch live status with instance token
    let connectionStatus = admin.normalizeStatus(remote);
    try {
      const client = new UazapiClient(baseUrl, token);
      const statusRes = await client.getStatus();
      connectionStatus = normalizeConnectionStatus(statusRes);
    } catch {
      // keep status from list response
    }

    const { error: updateError } = await supabase
      .from('instances')
      .update({
        uazapi_token: token,
        uazapi_base_url: baseUrl,
        connection_status: connectionStatus,
        last_status_check: new Date().toISOString(),
      })
      .eq('doctor_id', doctor.id);

    if (updateError) {
      console.error(`❌ ${doctor.name}:`, updateError.message);
      continue;
    }

    matched++;
    if (connectionStatus === 'connected') connected++;

    console.log(
      `✅ ${doctor.name} (${instanceName}) → ${connectionStatus}`
    );

    if (configureWebhooks) {
      try {
        const client = new UazapiClient(baseUrl, token);
        const webhookUrl = `${appUrl}/api/webhook/uazapi?instance=${encodeURIComponent(doctor.instance_name)}`;
        await client.setWebhook(webhookUrl);
        await supabase
          .from('instances')
          .update({ webhook_configured: true })
          .eq('doctor_id', doctor.id);
        webhooks++;
        console.log(`   🔗 Webhook configurado`);
      } catch (err) {
        console.warn(
          `   ⚠️ Webhook falhou:`,
          err instanceof Error ? err.message : err
        );
      }
    }
  }

  console.log('\n--- Resumo ---');
  console.log(`✅ Sincronizados: ${matched}`);
  console.log(`🟢 Conectados: ${connected}`);
  if (configureWebhooks) console.log(`🔗 Webhooks: ${webhooks}`);
  if (unmatched.length) {
    console.log(`⚠️ Não encontrados no banco (${unmatched.length}):`);
    unmatched.slice(0, 10).forEach((n) => console.log(`   - ${n}`));
    if (unmatched.length > 10) console.log(`   ... e mais ${unmatched.length - 10}`);
  if (matched === 0 && remoteInstances.length === 0) {
    console.log('\n💡 Dicas:');
    console.log('   - Confira UAZAPI_BASE_URL (ex: https://focus.uazapi.com)');
    console.log('   - Confira UAZAPI_ADMIN_TOKEN no painel Uazapi');
    console.log('   - O admin token é diferente do token de cada instância');
  }

  if (matched === 0 && remoteInstances.length > 0) {
    console.log('\n💡 Instâncias na Uazapi mas nenhuma bateu com o banco.');
    console.log('   Compare os nomes acima com a coluna "Name Instance" da planilha.');
  }
}

main().catch(console.error);
