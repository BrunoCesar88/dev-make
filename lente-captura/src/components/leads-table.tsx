'use client';

import type { ColumnDefinition } from '@/types/database';
import { getLeadCellValue, type LeadRow } from '@/lib/leads/columns';
import { LeadStatusSelect } from '@/components/lead-status-select';
import { formatPhone } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface LeadsTableProps {
  leads: LeadRow[];
  columns: ColumnDefinition[];
  showDoctor?: boolean;
}

type TableColumn =
  | { kind: 'field'; key: string; label: string; className?: string }
  | { kind: 'doctor'; key: '__doctor'; label: string; className?: string }
  | { kind: 'status'; key: '__status'; label: string; className?: string }
  | { kind: 'sheet'; key: '__sheet'; label: string; className?: string };

const COLUMN_MIN_WIDTH: Record<string, string> = {
  data: 'min-w-[104px]',
  nome: 'min-w-[150px]',
  telefone: 'min-w-[140px]',
  convenio: 'min-w-[110px]',
  canais: 'min-w-[110px]',
  status: 'min-w-[168px]',
  agendamento: 'min-w-[130px]',
  compareceu: 'min-w-[120px]',
  procedimento: 'min-w-[160px]',
  valor_procedimento: 'min-w-[130px]',
  observacao: 'min-w-[180px]',
  anuncio: 'min-w-[220px]',
};

function columnClassName(key: string): string {
  return cn(
    'whitespace-nowrap',
    COLUMN_MIN_WIDTH[key] ?? 'min-w-[120px]'
  );
}

function LeadMobileCard({
  lead,
  statusOptions,
  showDoctor,
}: {
  lead: LeadRow;
  statusOptions?: string[] | null;
  showDoctor?: boolean;
}) {
  return (
    <article className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold text-[var(--brand-text)]">
            {lead.patient_name || 'Sem nome'}
          </h3>
          {showDoctor && (
            <p className="mt-0.5 truncate text-[12px] text-[var(--brand-text-tertiary)]">
              {lead.doctor?.name || '—'}
            </p>
          )}
        </div>
        <LeadStatusSelect
          leadId={lead.id}
          value={lead.status}
          statusOptions={statusOptions}
        />
      </div>

      <dl className="mt-3 grid grid-cols-1 gap-2 text-[13px]">
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--brand-text-tertiary)]">Data</dt>
          <dd className="text-right text-[var(--brand-text-secondary)]">
            {getLeadCellValue(lead, 'data')}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--brand-text-tertiary)]">Telefone</dt>
          <dd className="text-right font-mono text-[var(--brand-text)]">
            {formatPhone(lead.patient_phone)}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--brand-text-tertiary)]">Canais</dt>
          <dd className="text-right text-[var(--brand-text)]">
            {getLeadCellValue(lead, 'canais')}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--brand-text-tertiary)]">Convênio</dt>
          <dd className="text-right text-[var(--brand-text-secondary)]">
            {getLeadCellValue(lead, 'convenio')}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--brand-text-tertiary)]">Anúncio</dt>
          <dd className="break-all text-right text-[var(--brand-text)]">
            {getLeadCellValue(lead, 'anuncio')}
          </dd>
        </div>
      </dl>
    </article>
  );
}

function buildTableColumns(
  columns: ColumnDefinition[],
  showDoctor: boolean
): TableColumn[] {
  const sorted = [...columns].sort((a, b) => a.display_order - b.display_order);
  const result: TableColumn[] = [];

  for (const col of sorted) {
    if (col.key === 'status') {
      result.push({
        kind: 'status',
        key: '__status',
        label: col.label,
        className: columnClassName('status'),
      });
      continue;
    }

    result.push({
      kind: 'field',
      key: col.key,
      label: col.label,
      className: columnClassName(col.key),
    });

    if (showDoctor && col.key === 'nome') {
      result.push({
        kind: 'doctor',
        key: '__doctor',
        label: 'Médico',
        className: 'min-w-[150px] whitespace-nowrap',
      });
    }
  }

  result.push({
    kind: 'sheet',
    key: '__sheet',
    label: 'Plan.',
    className: 'min-w-[52px] whitespace-nowrap text-center',
  });

  return result;
}

function cellValue(lead: LeadRow, col: TableColumn): string {
  if (col.kind === 'doctor') return lead.doctor?.name || '—';
  if (col.kind === 'field') return getLeadCellValue(lead, col.key);
  return '';
}

function cellTitle(lead: LeadRow, col: TableColumn): string | undefined {
  if (col.kind !== 'field') return undefined;
  const value = getLeadCellValue(lead, col.key);
  return value !== '—' ? value : undefined;
}

export function LeadsTable({ leads, columns, showDoctor }: LeadsTableProps) {
  const statusColumn = columns.find((c) => c.key === 'status');
  const tableColumns = buildTableColumns(columns, Boolean(showDoctor));

  return (
    <>
      <div className="space-y-3 lg:hidden">
        {leads.map((lead) => (
          <LeadMobileCard
            key={lead.id}
            lead={lead}
            statusOptions={statusColumn?.status_options as string[] | null}
            showDoctor={showDoctor}
          />
        ))}
      </div>

      <div className="hidden lg:block">
        <div className="max-h-[min(75vh,920px)] overflow-auto rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)]">
          <table className="w-max min-w-full border-collapse text-[13px]">
            <thead className="table-head sticky top-0 z-10 bg-[var(--brand-surface)] shadow-[0_1px_0_var(--brand-border)]">
              <tr>
                {tableColumns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--brand-text-tertiary)]',
                      col.className
                    )}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--brand-border)]">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-[var(--brand-hover)]/40">
                  {tableColumns.map((col) => {
                    if (col.kind === 'status') {
                      return (
                        <td key={col.key} className={cn('px-4 py-2.5', col.className)}>
                          <LeadStatusSelect
                            leadId={lead.id}
                            value={lead.status}
                            statusOptions={
                              statusColumn?.status_options as string[] | null
                            }
                            compact
                          />
                        </td>
                      );
                    }

                    if (col.kind === 'sheet') {
                      return (
                        <td
                          key={col.key}
                          className={cn('px-4 py-2.5', col.className)}
                          title={lead.synced_to_sheets ? 'Na planilha' : 'Fora da planilha'}
                        >
                          {lead.synced_to_sheets ? (
                            <span className="text-[#34c759]">✓</span>
                          ) : (
                            <span className="text-[#ff9500]">✗</span>
                          )}
                        </td>
                      );
                    }

                    const value = cellValue(lead, col);
                    const isMuted =
                      col.kind === 'field' &&
                      (col.key === 'data' ||
                        col.key === 'convenio' ||
                        col.key === 'observacao');

                    return (
                      <td
                        key={col.key}
                        className={cn(
                          'px-4 py-2.5 text-[var(--brand-text)]',
                          isMuted && 'text-[var(--brand-text-secondary)]',
                          col.className
                        )}
                        title={cellTitle(lead, col)}
                      >
                        {value}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[12px] text-[var(--brand-text-tertiary)]">
          Role horizontalmente para ver todas as colunas.
        </p>
      </div>
    </>
  );
}
