import type { UazapiWebhookPayload } from '@/types/database';

export interface ParsedUazapiMessage {
  instanceName: string | null;
  patientPhone: string;
  patientName: string | null;
  message: string | null;
  messageContent: unknown;
  messageId: string | null;
  chatId: string | null;
  fromMe: boolean;
  rawPayload: Record<string, unknown>;
}

function digitsFromJid(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.replace('@s.whatsapp.net', '').replace(/\D/g, '');
  if (!cleaned) return null;
  return cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
}

function resolvePhoneFromLegacy(key: Record<string, unknown>): string | null {
  const remoteJid = String(key.remoteJid || '');
  const senderPn = String(key.senderPn || '');

  if (remoteJid.includes('@lid') && senderPn) {
    return digitsFromJid(senderPn);
  }
  return digitsFromJid(remoteJid || senderPn);
}

function resolvePhoneFromGo(body: Record<string, unknown>): string | null {
  const chat = body.chat as Record<string, unknown> | undefined;
  const message = body.message as Record<string, unknown> | undefined;

  const waChatId = String(chat?.wa_chatid || message?.chatid || '');
  const senderPn = String(message?.sender_pn || message?.senderPn || '');

  if (waChatId.includes('@lid') && senderPn) {
    return digitsFromJid(senderPn);
  }

  return digitsFromJid(waChatId || senderPn || String(chat?.phone || ''));
}

function extractLegacyText(data: Record<string, unknown>): string | null {
  const message = data.message as Record<string, unknown> | undefined;
  if (!message) return null;
  if (typeof message.conversation === 'string') return message.conversation;
  const extended = message.extendedTextMessage as Record<string, unknown> | undefined;
  if (typeof extended?.text === 'string') return extended.text;
  return null;
}

function parseGoFormat(body: Record<string, unknown>): ParsedUazapiMessage | null {
  const message = body.message as Record<string, unknown> | undefined;
  if (!message) return null;

  const phone = resolvePhoneFromGo(body);
  if (!phone) return null;

  const chat = body.chat as Record<string, unknown> | undefined;
  const content = message.content;
  const text =
    (typeof message.text === 'string' ? message.text : null) ||
    (typeof content === 'string' ? content : null) ||
    null;

  return {
    instanceName:
      (typeof body.instanceName === 'string' && body.instanceName) ||
      (typeof body.instance_name === 'string' && body.instance_name) ||
      null,
    patientPhone: phone,
    patientName:
      (typeof message.senderName === 'string' && message.senderName) ||
      (typeof chat?.wa_name === 'string' && chat.wa_name) ||
      (typeof chat?.name === 'string' && chat.name) ||
      null,
    message: text,
    messageContent: content ?? message,
    messageId:
      (typeof message.messageid === 'string' && message.messageid) ||
      (typeof message.id === 'string' && message.id) ||
      null,
    chatId:
      (typeof message.chatid === 'string' && message.chatid) ||
      (typeof chat?.wa_chatid === 'string' && chat.wa_chatid) ||
      null,
    fromMe: Boolean(message.fromMe),
    rawPayload: body,
  };
}

export function parseWebhookPayload(
  payload: UazapiWebhookPayload | Record<string, unknown>
): ParsedUazapiMessage | null {
  const root = payload as Record<string, unknown>;
  const body = (root.body as Record<string, unknown> | undefined) || root;

  const goParsed = parseGoFormat(body);
  if (goParsed) return goParsed;

  // Formato v2 (message object no root)
  if (root.message && typeof root.message === 'object') {
    const msg = root.message as Record<string, unknown>;
    if (msg.fromMe) return null;

    const phone = digitsFromJid(
      String(msg.sender || msg.chatid || msg.sender_pn || '')
    );
    if (!phone) return null;

    return {
      instanceName:
        (typeof root.instanceName === 'string' && root.instanceName) || null,
      patientPhone: phone,
      patientName: (typeof msg.senderName === 'string' && msg.senderName) || null,
      message: (typeof msg.text === 'string' && msg.text) || null,
      messageContent: msg.content ?? msg,
      messageId:
        (typeof msg.messageid === 'string' && msg.messageid) ||
        (typeof msg.id === 'string' && msg.id) ||
        null,
      chatId: (typeof msg.chatid === 'string' && msg.chatid) || null,
      fromMe: Boolean(msg.fromMe),
      rawPayload: root,
    };
  }

  // Formato legacy (data.key)
  const data = body.data as Record<string, unknown> | undefined;
  if (data?.key) {
    const key = data.key as Record<string, unknown>;
    if (key.fromMe) return null;

    const phone = resolvePhoneFromLegacy(key);
    if (!phone) return null;

    return {
      instanceName:
        (typeof body.instanceName === 'string' && body.instanceName) ||
        (typeof data.instanceId === 'string' && data.instanceId) ||
        null,
      patientPhone: phone,
      patientName:
        (typeof data.pushName === 'string' && data.pushName) || null,
      message: extractLegacyText(data),
      messageContent: data.message ?? null,
      messageId: (typeof key.id === 'string' && key.id) || null,
      chatId: (typeof key.remoteJid === 'string' && key.remoteJid) || null,
      fromMe: Boolean(key.fromMe),
      rawPayload: body,
    };
  }

  return null;
}

/** @deprecated Use classifyLeadOrigin — mantido para compatibilidade */
export function shouldCaptureLead(message: string | null): boolean {
  if (!message) return false;
  return message.trim().length >= 2;
}
