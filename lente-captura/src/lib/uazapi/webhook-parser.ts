import type { UazapiWebhookPayload } from '@/types/database';

export function parseWebhookPayload(
  payload: UazapiWebhookPayload
): {
  patientPhone: string;
  patientName: string | null;
  message: string | null;
  messageId: string | null;
  chatId: string | null;
  fromMe: boolean;
} | null {
  // Formato v2 (message object)
  if (payload.message) {
    const msg = payload.message;
    if (msg.fromMe) return null;

    const phone = (msg.sender || msg.chatid || '')
      .replace('@s.whatsapp.net', '')
      .replace(/\D/g, '');

    if (!phone) return null;

    return {
      patientPhone: phone.startsWith('55') ? phone : `55${phone}`,
      patientName: msg.senderName || null,
      message: msg.text || null,
      messageId: msg.messageid || null,
      chatId: msg.chatid || null,
      fromMe: !!msg.fromMe,
    };
  }

  // Formato legacy (data object)
  if (payload.data?.key) {
    const key = payload.data.key;
    if (key.fromMe) return null;

    const jid = key.remoteJid || '';
    const phone = jid.replace('@s.whatsapp.net', '').replace(/\D/g, '');
    if (!phone) return null;

    const text =
      payload.data.message?.conversation ||
      payload.data.message?.extendedTextMessage?.text ||
      null;

    return {
      patientPhone: phone.startsWith('55') ? phone : `55${phone}`,
      patientName: payload.data.pushName || null,
      message: text,
      messageId: key.id || null,
      chatId: jid,
      fromMe: !!key.fromMe,
    };
  }

  return null;
}

export function shouldCaptureLead(message: string | null): boolean {
  if (!message) return false;
  const trimmed = message.trim();
  if (trimmed.length < 2) return false;
  // Ignora mensagens automáticas comuns
  const ignore = ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite'];
  if (ignore.includes(trimmed.toLowerCase()) && trimmed.length < 10) {
    return true; // ainda captura saudações — planilha original captura tudo
  }
  return true;
}
