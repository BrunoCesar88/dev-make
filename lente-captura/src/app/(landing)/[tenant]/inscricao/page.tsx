import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { loadDoctorLandingConfig } from '@/lib/tracking/landing';
import { InscricaoClient } from '@/components/landing/inscricao-client';
import '@/components/landing/inscricao.css';

export const dynamic = 'force-dynamic';

export default async function InscricaoPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const supabase = await createServiceClient();
  const config = await loadDoctorLandingConfig(supabase, tenant);

  if (!config) notFound();

  return (
    <InscricaoClient
      tenantSlug={config.tenantSlug}
      doctorName={config.doctorName}
      metaPixelId={config.metaPixelId}
      ga4MeasurementId={config.ga4MeasurementId}
    />
  );
}
