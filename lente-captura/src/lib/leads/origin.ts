export function leadOrigemFromFields(
  fields: Record<string, unknown> | null | undefined
): string {
  if (!fields) return '';
  return String(
    fields.canais ||
      fields.Canais ||
      fields.origem ||
      fields.Origem ||
      ''
  ).trim();
}

export function isMetaOrigem(origem: string): boolean {
  const o = origem.toUpperCase();
  return o.includes('META') || o.includes('FACEBOOK') || o.includes('FB');
}

export function isGoogleOrigem(origem: string): boolean {
  const o = origem.toUpperCase();
  return o.includes('GOOGLE');
}
