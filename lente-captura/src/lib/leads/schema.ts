/** Ordem e chaves das colunas espelhando a planilha Google Sheets */

export const LEAD_SHEET_COLUMN_KEYS = [
  'data',
  'nome',
  'telefone',
  'convenio',
  'canais',
  'status',
  'agendamento',
  'compareceu',
  'procedimento',
  'valor_procedimento',
  'observacao',
  'anuncio',
] as const;

export type LeadSheetColumnKey = (typeof LEAD_SHEET_COLUMN_KEYS)[number];

export const LEAD_STATUS_LABELS = [
  'AGUARDANDO RESPOSTA',
  'EM ATENDIMENTO',
  'SUCESSO',
  'DESCARTADO',
  'DESMARCOU',
] as const;

export const DEFAULT_LEAD_STATUS = 'aguardando_resposta';

export const DEFAULT_CANAIS_OPTIONS = [
  'META',
  'LINK DA BIO',
  'GOOGLE',
  'MANYCHAT',
  'SOCIAL SELLING',
  'INDICAÇÃO',
  'DESCONHECIDO',
] as const;
