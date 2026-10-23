import { isPlaceholderPhrase } from '@/lib/leads/manychat-triggers';

/** Separa frases salvas (uma por linha) ou array JSON legado. */
export function parsePhraseVariations(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];

  const trimmed = value.trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim())
          .filter((item) => item.length > 0);
      }
    } catch {
      // fallback para newline
    }
  }

  return trimmed
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function serializePhraseVariations(phrases: string[]): string | null {
  const cleaned = phrases
    .map((phrase) => phrase.trim())
    .filter((phrase) => phrase.length > 0 && !isPlaceholderPhrase(phrase));

  return cleaned.length > 0 ? cleaned.join('\n') : null;
}

export function expandPhraseFields(data: {
  bio_phrase: string | null;
  site_phrase: string | null;
  manychat_phrase: string | null;
  social_selling_phrase: string | null;
}) {
  return {
    ...data,
    bio_phrases: parsePhraseVariations(data.bio_phrase),
    site_phrases: parsePhraseVariations(data.site_phrase),
    manychat_phrases: parsePhraseVariations(data.manychat_phrase),
    social_selling_phrases: parsePhraseVariations(data.social_selling_phrase),
  };
}

export function normalizePhraseInput(value: unknown): string | null {
  if (Array.isArray(value)) {
    return serializePhraseVariations(value.map(String));
  }
  if (typeof value === 'string') {
    return serializePhraseVariations(parsePhraseVariations(value));
  }
  return null;
}
