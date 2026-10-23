interface MetaGraphError {
  error?: { message?: string };
}

export interface MetaAdAccountSummary {
  id: string;
  name?: string;
  account_id?: string;
  account_status?: number;
}

export async function fetchMetaAdAccounts(
  accessToken: string
): Promise<{ accounts: MetaAdAccountSummary[]; error?: string }> {
  const url =
    'https://graph.facebook.com/v22.0/me/adaccounts' +
    '?fields=id,name,account_id,account_status' +
    `&limit=100&access_token=${encodeURIComponent(accessToken)}`;

  const res = await fetch(url);
  const json = (await res.json()) as {
    data?: MetaAdAccountSummary[];
  } & MetaGraphError;

  if (!res.ok) {
    return {
      accounts: [],
      error: json.error?.message || `Meta API ${res.status}`,
    };
  }

  return { accounts: json.data || [] };
}

export function normalizeMetaAdAccountId(accountId: string): string {
  return accountId.replace(/^act_/, '').trim();
}

export function metaAdAccountMatches(
  configuredId: string,
  account: MetaAdAccountSummary
): boolean {
  const clean = normalizeMetaAdAccountId(configuredId);
  const accountNum = account.account_id || account.id.replace(/^act_/, '');
  return clean === accountNum || account.id === `act_${clean}`;
}

export function describeMetaAdAccountAccess(
  configuredId: string,
  accounts: MetaAdAccountSummary[]
): string | null {
  if (!accounts.length) {
    return 'O token não tem acesso a nenhuma conta de anúncios. Gere o token com permissão ads_read e selecione a conta correta no Business Manager.';
  }

  const match = accounts.find((a) => metaAdAccountMatches(configuredId, a));
  if (match) {
    return null;
  }

  const available = accounts
    .slice(0, 5)
    .map((a) => `${a.name || 'Sem nome'} (${a.account_id || a.id})`)
    .join(', ');

  return `O ID salvo (${configuredId}) não bate com nenhuma conta acessível por este token. Contas disponíveis: ${available}.`;
}
