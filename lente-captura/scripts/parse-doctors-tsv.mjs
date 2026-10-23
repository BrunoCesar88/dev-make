#!/usr/bin/env node
/**
 * Converte colagem TSV da planilha de controle em active-doctors.json
 * Usage: node scripts/parse-doctors-tsv.mjs < data/doctors-paste.tsv
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function extractSpreadsheetId(url) {
  if (!url) return null;
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match?.[1] ?? null;
}

function normalizePhone(phone) {
  if (!phone?.trim()) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  return digits.startsWith('55') ? `+${digits}` : `+55${digits}`;
}

function mapStatus(sheetStatus) {
  const s = (sheetStatus || '').trim().toLowerCase();
  if (s === 'ativada' || s === 'api oficial') return 'active';
  if (s === 'desativada' || s === 'com problema' || s === 'usa crm') return 'inactive';
  if (s === 'em conversa' || s === 'aguardando start') return 'pending';
  return 'inactive';
}

function mapApi(api) {
  const a = (api || '').trim().toLowerCase();
  if (a.includes('evo')) return 'evoapi';
  return 'uazapi';
}

function mapLead(val) {
  const v = (val || '').trim().toUpperCase();
  return v === 'SIM';
}

function suggestInstanceName(fullName) {
  const cleaned = fullName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();

  const prefixMatch = cleaned.match(/^(Dra?a?|Dr)\.?\s*/i);
  let prefix = '';
  let rest = cleaned;
  if (prefixMatch) {
    const p = prefixMatch[0].toLowerCase();
    prefix = p.startsWith('dra') ? 'Dra' : 'Dr';
    rest = cleaned.slice(prefixMatch[0].length).trim();
  } else if (/^cl[ií]nica/i.test(cleaned)) {
    prefix = 'Clinica';
    rest = cleaned.replace(/^cl[ií]nica\s*/i, '').trim();
  }

  const parts = rest.split(/\s+/).filter(Boolean);
  const slug = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join('-');
  return prefix ? `${prefix}-${slug}` : slug;
}

const inputPath = process.argv[2]
  ? resolve(process.argv[2])
  : resolve(__dirname, '../data/doctors-paste.tsv');

const raw = readFileSync(inputPath, 'utf-8');
const lines = raw.split(/\r?\n/).filter((l) => l.trim());

const doctors = [];
const seen = new Set();

for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split('\t');
  if (cols.length < 7) continue;

  let instanceName = cols[0]?.trim() || '';
  const name = cols[1]?.replace(/[\u200B-\u200D\uFEFF]/g, '').trim() || '';
  const phone = cols[2]?.trim() || '';
  const spreadsheetUrl = cols[3]?.trim() || '';
  const sheetGid = cols[4]?.trim() || 'gid=0';
  const manager = cols[5]?.trim() || null;
  const sheetStatus = cols[6]?.trim() || '';
  const api = cols[7]?.trim() || 'UazApi';
  const leadCol = cols[8]?.trim() || '';
  const bioLink = cols[10]?.trim() || null;

  if (!name) continue;

  if (!instanceName) {
    instanceName = suggestInstanceName(name);
  }

  if (seen.has(instanceName)) continue;
  seen.add(instanceName);

  doctors.push({
    instance_name: instanceName,
    name,
    phone: normalizePhone(phone),
    spreadsheet_url: spreadsheetUrl || null,
    spreadsheet_id: extractSpreadsheetId(spreadsheetUrl),
    sheet_gid: sheetGid,
    manager,
    status: mapStatus(sheetStatus),
    api: mapApi(api),
    lead_enabled: mapLead(leadCol),
    bio_link: bioLink || null,
    sheet_status: sheetStatus,
  });
}

const outPath = resolve(__dirname, '../data/active-doctors.json');
writeFileSync(outPath, JSON.stringify(doctors, null, 2) + '\n');

const byStatus = doctors.reduce((acc, d) => {
  acc[d.status] = (acc[d.status] || 0) + 1;
  return acc;
}, {});

console.log(`✅ ${doctors.length} médicos → ${outPath}`);
console.log('   Por status:', byStatus);
