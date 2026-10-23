import {
  isPlaceholderPhrase,
  matchesManychatTriggers,
} from '@/lib/leads/manychat-triggers';
import { parsePhraseVariations } from '@/lib/leads/phrase-variations';

export type LeadOriginLabel =
  | 'META'
  | 'LINK DA BIO'
  | 'GOOGLE'
  | 'MANYCHAT'
  | 'SOCIAL SELLING';

export interface DoctorLeadPhrases {
  bio_phrase: string | null;
  site_phrase: string | null;
  manychat_phrase: string | null;
  social_selling_phrase: string | null;
}

export interface ClassifyLeadInput {
  messageText: string | null;
  messageContent: unknown;
  fromMe: boolean;
  phrases: DoctorLeadPhrases;
}

export interface ClassifiedLeadOrigin {
  accepted: boolean;
  origem?: LeadOriginLabel;
  anuncio?: string | null;
  reason?: string;
}

function extractMessageText(messageText: string | null, messageContent: unknown): string {
  if (messageText?.trim()) return messageText.trim();
  if (typeof messageContent === 'string' && messageContent.trim()) {
    return messageContent.trim();
  }
  if (messageContent && typeof messageContent === 'object') {
    const obj = messageContent as Record<string, unknown>;
    if (typeof obj.text === 'string' && obj.text.trim()) return obj.text.trim();
  }
  return '';
}

function getContextInfo(messageContent: unknown): Record<string, unknown> | null {
  if (!messageContent || typeof messageContent !== 'object') return null;
  const info = (messageContent as Record<string, unknown>).contextInfo;
  return info && typeof info === 'object'
    ? (info as Record<string, unknown>)
    : null;
}

function isMetaAdsMessage(messageContent: unknown): boolean {
  const contextInfo = getContextInfo(messageContent);
  if (!contextInfo) return false;

  if (contextInfo.conversionSource === 'FB_Ads') return true;

  const externalAdReply = contextInfo.externalAdReply;
  if (externalAdReply && typeof externalAdReply === 'object') {
    return (externalAdReply as Record<string, unknown>).sourceType === 'ad';
  }

  return false;
}

function getMetaAdUrl(messageContent: unknown): string | null {
  const contextInfo = getContextInfo(messageContent);
  if (!contextInfo) return null;
  const externalAdReply = contextInfo.externalAdReply;
  if (!externalAdReply || typeof externalAdReply !== 'object') return null;
  const url = (externalAdReply as Record<string, unknown>).sourceURL;
  return typeof url === 'string' ? url : null;
}

function exactPhraseMatch(message: string, phrase: string | null | undefined): boolean {
  const variations = parsePhraseVariations(phrase);
  if (variations.length === 0) return false;

  const normalizedMessage = message.trim();
  return variations.some(
    (variation) => !isPlaceholderPhrase(variation) && normalizedMessage === variation.trim()
  );
}

/**
 * Replica a árvore de decisão do workflow n8n "Lente - Captura de Leads (Uazapi)".
 */
export function classifyLeadOrigin(input: ClassifyLeadInput): ClassifiedLeadOrigin {
  const text = extractMessageText(input.messageText, input.messageContent);
  if (!text) {
    return { accepted: false, reason: 'empty_message' };
  }

  // Ramo Social Selling no n8n roda com fromMe=true; espelhamos aqui.
  if (input.fromMe) {
    if (
      exactPhraseMatch(text, input.phrases.social_selling_phrase)
    ) {
      return {
        accepted: true,
        origem: 'SOCIAL SELLING',
        anuncio: text,
      };
    }
    return { accepted: false, reason: 'from_me_not_social_selling' };
  }

  if (isMetaAdsMessage(input.messageContent)) {
    return {
      accepted: true,
      origem: 'META',
      anuncio: getMetaAdUrl(input.messageContent),
    };
  }

  if (exactPhraseMatch(text, input.phrases.bio_phrase)) {
    return {
      accepted: true,
      origem: 'LINK DA BIO',
      anuncio: null,
    };
  }

  if (exactPhraseMatch(text, input.phrases.site_phrase)) {
    return {
      accepted: true,
      origem: 'GOOGLE',
      anuncio: null,
    };
  }

  if (matchesManychatTriggers(text, input.phrases.manychat_phrase)) {
    return {
      accepted: true,
      origem: 'MANYCHAT',
      anuncio: text,
    };
  }

  return { accepted: false, reason: 'no_origin_match' };
}
