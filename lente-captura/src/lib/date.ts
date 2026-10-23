/** Fuso e locale padrão do sistema (Brasil) */
export const BR_TIMEZONE = 'America/Sao_Paulo';
export const BR_LOCALE = 'pt-BR';

function brDateParts(date: Date) {
  return new Intl.DateTimeFormat(BR_LOCALE, {
    timeZone: BR_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
}

function part(parts: Intl.DateTimeFormatPart[], type: string): string {
  return parts.find((p) => p.type === type)?.value ?? '';
}

/** DD/MM/AAAA, HH:mm */
export function formatDate(date: string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '—';

  const p = brDateParts(d);
  return `${part(p, 'day')}/${part(p, 'month')}/${part(p, 'year')}, ${part(p, 'hour')}:${part(p, 'minute')}`;
}

/** DD/MM/AAAA */
export function formatDateOnly(date: string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '—';

  const p = new Intl.DateTimeFormat(BR_LOCALE, {
    timeZone: BR_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(d);

  return `${part(p, 'day')}/${part(p, 'month')}/${part(p, 'year')}`;
}

/** DD/MM/AAAA às HH:mm — para listas compactas */
export function formatDateShort(date: string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '—';

  const p = brDateParts(d);
  return `${part(p, 'day')}/${part(p, 'month')}/${part(p, 'year')} às ${part(p, 'hour')}:${part(p, 'minute')}`;
}

export function formatNowBrazilian(): string {
  const now = new Date();
  const p = brDateParts(now);
  const sec =
    new Intl.DateTimeFormat(BR_LOCALE, {
      timeZone: BR_TIMEZONE,
      second: '2-digit',
      hour12: false,
    })
      .formatToParts(now)
      .find((x) => x.type === 'second')?.value ?? '00';

  return `${part(p, 'day')}/${part(p, 'month')}/${part(p, 'year')} ${part(p, 'hour')}:${part(p, 'minute')}:${sec}`;
}

/** Converte componentes DD/MM/AAAA HH:mm:ss (horário de Brasília) para ISO UTC */
function brazilianPartsToIso(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0
): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const pad = (n: number) => String(n).padStart(2, '0');
  // America/Sao_Paulo = UTC-3 (sem horário de verão desde 2019)
  const withOffset = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}-03:00`;
  const parsed = new Date(withOffset);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function currentYearBRT(): number {
  return Number(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: BR_TIMEZONE,
      year: 'numeric',
    }).format(new Date())
  );
}

export interface ParseBrazilianDateOptions {
  /** Ano padrão para datas sem ano (ex.: aba "2026" da planilha) */
  defaultYear?: number;
}

/**
 * Interpreta datas no padrão brasileiro (DD/MM/AAAA) das planilhas.
 * Aceita também DD/MM sem ano (usa defaultYear ou ano atual em BRT).
 * Horário das planilhas é interpretado no fuso America/Sao_Paulo.
 */
export function parseBrazilianDateString(
  value: string,
  options: ParseBrazilianDateOptions = {}
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const defaultYear = options.defaultYear ?? currentYearBRT();

  // Serial do Google Sheets (ex.: 45826.7123)
  const serial = Number(trimmed);
  if (!Number.isNaN(serial) && serial > 30000 && serial < 100000 && !trimmed.includes('/')) {
    const ms = Math.round((serial - 25569) * 86400 * 1000);
    const parsed = new Date(ms);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }

  const brMatch = trimmed.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (brMatch) {
    let [, a, b, yearRaw, hour = '0', minute = '0', second = '0'] = brMatch;
    let day = +a;
    let month = +b;
    let year = yearRaw.length === 2 ? 2000 + +yearRaw : +yearRaw;
    // Corrige typos comuns na planilha (ex.: 25/02/0206 → 2026)
    if (year < 100) year += 2000;
    if (year > 2100) year = 2000 + (year % 100);

    if (day <= 12 && month <= 12 && day !== month) {
      // DD/MM BR
    } else if (day > 12 && month <= 12) {
      // dia claro
    } else if (month > 12 && day <= 12) {
      [day, month] = [month, day];
    }

    return brazilianPartsToIso(year, month, day, +hour, +minute, +second);
  }

  const shortMatch = trimmed.match(
    /^(\d{1,2})[\/\-](\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (shortMatch) {
    const [, day, month, hour = '0', minute = '0', second = '0'] = shortMatch;
    return brazilianPartsToIso(
      defaultYear,
      +month,
      +day,
      +hour,
      +minute,
      +second
    );
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }

  return null;
}

export function parseBrazilianDateStringOrNow(value: string): string {
  return parseBrazilianDateString(value) ?? new Date().toISOString();
}

/** Data de ontem 00:00 no fuso de São Paulo */
export function getStartOfYesterdayBRT(): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BR_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  const day = Number(parts.find((p) => p.type === 'day')?.value);

  const yesterday = new Date(Date.UTC(year, month - 1, day));
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return yesterday;
}
