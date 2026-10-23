export function formatMetaApiError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('session has expired') || lower.includes('error validating access token')) {
    return 'Token da Meta Ads expirou. Gere um novo no Business Manager (System User → Generate token com ads_read) e cole em META_ADS_ACCESS_TOKEN.';
  }

  if (lower.includes('ads_read') || lower.includes('permission')) {
    return 'Token sem permissão ads_read. Use um System User do Business Manager com acesso à conta de anúncios.';
  }

  if (lower.includes('invalid oauth') || lower.includes('code":190')) {
    return 'Token da Meta inválido ou revogado. Cole um token novo no cadastro do médico.';
  }

  if (message.length > 220) {
    return `${message.slice(0, 220)}…`;
  }

  return message;
}
