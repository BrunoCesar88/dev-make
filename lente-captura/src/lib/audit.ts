import type { Profile } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

type AuditAction =
  | 'lead_create'
  | 'lead_update'
  | 'lead_status_change'
  | 'lead_delete'
  | 'column_create'
  | 'column_update'
  | 'column_delete'
  | 'column_reorder'
  | 'sheets_sync'
  | 'user_create'
  | 'user_update'
  | 'doctor_tracking_update';

interface AuditParams {
  profile: Profile | null;
  action: AuditAction;
  entityType: string;
  doctorId?: string;
  leadId?: string;
  fieldKey?: string;
  oldValue?: string | null;
  newValue?: string | null;
  metadata?: Record<string, unknown>;
}

export async function logAudit({
  profile,
  action,
  entityType,
  doctorId,
  leadId,
  fieldKey,
  oldValue,
  newValue,
  metadata,
}: AuditParams) {
  const supabase = await createServiceClient();
  await supabase.from('audit_logs').insert({
    user_id: profile?.id ?? null,
    user_email: profile?.email ?? 'system',
    user_role: profile?.role ?? 'system',
    doctor_id: doctorId ?? null,
    lead_id: leadId ?? null,
    action,
    entity_type: entityType,
    field_key: fieldKey ?? null,
    old_value: oldValue ?? null,
    new_value: newValue ?? null,
    metadata: metadata ?? null,
  });
}
