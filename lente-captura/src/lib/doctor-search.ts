/** Texto normalizado para busca de médicos (sem acento, ignora Dr./Dra.) */
export function normalizeDoctorSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(dra?|dr)\.?\s*/gi, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function doctorMatchesSearch(name: string, query: string): boolean {
  const normalizedQuery = normalizeDoctorSearchText(query);
  if (!normalizedQuery) return true;

  const normalizedName = normalizeDoctorSearchText(name);
  if (normalizedName.includes(normalizedQuery)) return true;

  const tokens = normalizedQuery.split(' ').filter(Boolean);
  return tokens.every((token) => normalizedName.includes(token));
}
