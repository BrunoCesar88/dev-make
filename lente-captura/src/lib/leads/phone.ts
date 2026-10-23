/** Normaliza telefone para comparação e armazenamento (padrão BR com 55). */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length >= 10 && digits.length <= 11 && !digits.startsWith('55')) {
    return `55${digits}`;
  }
  return digits;
}
