import { parsePhraseVariations } from '@/lib/leads/phrase-variations';

/** Gatilhos globais Manychat (automação n8n — Code in JavaScript) */
export const DEFAULT_MANYCHAT_TRIGGERS = [
  'oi! vi o post',
  'oi! vi o post sobre',
  'vi o post sobre',
  'oi! assisti ao video sobre',
  'assisti ao video sobre',
] as const;

export function normalizeTriggerText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function matchesManychatTriggers(
  message: string,
  extraPrefixes?: string | null
): boolean {
  const normalized = normalizeTriggerText(message);
  if (!normalized) return false;

  const triggers: string[] = [...DEFAULT_MANYCHAT_TRIGGERS];
  for (const prefix of parsePhraseVariations(extraPrefixes)) {
    if (!isPlaceholderPhrase(prefix)) {
      triggers.push(normalizeTriggerText(prefix));
    }
  }

  return triggers.some((trigger) => normalized.includes(trigger));
}

export function isPlaceholderPhrase(value: string | null | undefined): boolean {
  if (!value) return true;
  const trimmed = value.trim().toLowerCase();
  return trimmed === '' || trimmed === 'teste';
}
