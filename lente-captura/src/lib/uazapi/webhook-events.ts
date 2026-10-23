/** Catálogo completo de eventos Uazapi GO V2 (fallback se API não listar) */
export interface WebhookEventOption {
  id: string;
  label: string;
  description: string;
}

export const UAZAPI_WEBHOOK_EVENTS: WebhookEventOption[] = [
  { id: 'messages', label: 'Mensagens', description: 'Novas mensagens recebidas' },
  { id: 'messages_update', label: 'Atualização de mensagens', description: 'Edição, exclusão ou status de mensagem' },
  { id: 'connection', label: 'Conexão', description: 'Conectou, desconectou ou mudou status' },
  { id: 'qrcode', label: 'QR Code', description: 'QR Code gerado ou atualizado' },
  { id: 'history', label: 'Histórico', description: 'Sincronização de histórico de chats' },
  { id: 'chats', label: 'Chats', description: 'Alterações em conversas' },
  { id: 'contacts', label: 'Contatos', description: 'Novos ou atualizados contatos' },
  { id: 'presence', label: 'Presença', description: 'Online, digitando, gravando áudio' },
  { id: 'groups', label: 'Grupos', description: 'Criação ou alteração de grupos' },
  { id: 'groups_update', label: 'Atualização de grupos', description: 'Participantes, nome, config do grupo' },
  { id: 'group_participants', label: 'Participantes do grupo', description: 'Entrada ou saída de membros' },
  { id: 'calls', label: 'Chamadas', description: 'Chamadas de voz ou vídeo' },
  { id: 'call', label: 'Chamada (legado)', description: 'Evento de chamada individual' },
  { id: 'labels', label: 'Etiquetas', description: 'Etiquetas de conversa' },
  { id: 'newsletter', label: 'Newsletter', description: 'Canais e newsletters' },
  { id: 'status', label: 'Status/Stories', description: 'Status do WhatsApp' },
  { id: 'reactions', label: 'Reações', description: 'Reações em mensagens' },
  { id: 'polls', label: 'Enquetes', description: 'Votos e atualizações de enquete' },
  { id: 'buttons', label: 'Botões', description: 'Respostas de botões interativos' },
  { id: 'list', label: 'Listas', description: 'Respostas de listas interativas' },
];

export const UAZAPI_EXCLUDE_OPTIONS: WebhookEventOption[] = [
  { id: 'wasSentByApi', label: 'Enviadas pela API', description: 'Ignorar mensagens que o sistema enviou' },
  { id: 'isGroupYes', label: 'Grupos', description: 'Ignorar mensagens de grupos' },
  { id: 'fromMeYes', label: 'Enviadas por mim', description: 'Ignorar mensagens enviadas pelo próprio número' },
  { id: 'isGroupNo', label: 'Somente individuais', description: 'Filtro inverso de grupo' },
  { id: 'isNewsletterYes', label: 'Newsletter', description: 'Ignorar canais/newsletter' },
  { id: 'isStatusYes', label: 'Status', description: 'Ignorar atualizações de status' },
];

export function mergeEventCatalog(
  apiEvents: string[] | null | undefined
): WebhookEventOption[] {
  if (!apiEvents?.length) return UAZAPI_WEBHOOK_EVENTS;

  const known = new Map(UAZAPI_WEBHOOK_EVENTS.map((e) => [e.id, e]));
  const merged = [...UAZAPI_WEBHOOK_EVENTS];

  for (const id of apiEvents) {
    if (!known.has(id)) {
      merged.push({
        id,
        label: id,
        description: 'Evento retornado pela Uazapi',
      });
    }
  }

  return merged.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
}

export function mergeExcludeCatalog(
  apiExcludes: string[] | null | undefined
): WebhookEventOption[] {
  if (!apiExcludes?.length) return UAZAPI_EXCLUDE_OPTIONS;

  const known = new Map(UAZAPI_EXCLUDE_OPTIONS.map((e) => [e.id, e]));
  const merged = [...UAZAPI_EXCLUDE_OPTIONS];

  for (const id of apiExcludes) {
    if (!known.has(id)) {
      merged.push({ id, label: id, description: 'Filtro retornado pela Uazapi' });
    }
  }

  return merged;
}
