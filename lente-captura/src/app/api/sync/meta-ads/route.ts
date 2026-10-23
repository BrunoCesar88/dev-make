import { NextResponse } from 'next/server';
import {
  AuthError,
  canAccessDoctor,
  requireProfile,
} from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { syncMetaAdsForPeriod } from '@/lib/meta-ads/sync';

function isYmd(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function defaultRange() {
  const today = new Date();
  const from = new Date(today);
  from.setUTCDate(from.getUTCDate() - 7);
  const pad = (n: number) => String(n).padStart(2, '0');
  const ymd = (d: Date) =>
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  return { dateFrom: ymd(from), dateTo: ymd(today) };
}

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  return Boolean(secret && auth === `Bearer ${secret}`);
}

export async function POST(request: Request) {
  try {
    let body: {
      date_from?: string;
      date_to?: string;
      doctor_id?: string | null;
    } = {};

    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const defaults = defaultRange();
    const dateFrom = isYmd(body.date_from) ? body.date_from : defaults.dateFrom;
    const dateTo = isYmd(body.date_to) ? body.date_to : defaults.dateTo;

    let doctorId = body.doctor_id || null;

    if (!authorizeCron(request)) {
      const profile = await requireProfile();
      if (profile.role === 'admin') {
        // admin pode sincronizar todos ou um médico específico
      } else if (profile.role === 'doctor' && profile.doctor_id) {
        doctorId = profile.doctor_id;
      } else if (doctorId) {
        const allowed = await canAccessDoctor(profile, doctorId);
        if (!allowed) {
          throw new AuthError(403, 'Sem permissão para este médico');
        }
      } else {
        throw new AuthError(403, 'Acesso restrito');
      }
    }

    const supabase = await createServiceClient();
    const result = await syncMetaAdsForPeriod(supabase, {
      dateFrom,
      dateTo,
      doctorId,
    });

    return NextResponse.json({
      ok: true,
      date_from: dateFrom,
      date_to: dateTo,
      ...result,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao sincronizar Meta Ads' },
      { status: 500 }
    );
  }
}
