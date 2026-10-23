export function DeliveryStatus({
  ok,
  skippedBody,
}: {
  ok: number;
  skippedBody?: string | null;
}) {
  if (ok) {
    return <span className="dash-accent-green">✓</span>;
  }
  if (skippedBody?.startsWith('skipped:')) {
    return <span className="text-[var(--brand-text-tertiary)]">—</span>;
  }
  return <span className="dash-accent-red">✕</span>;
}
