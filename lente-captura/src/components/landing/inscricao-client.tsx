'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

interface InscricaoClientProps {
  tenantSlug: string;
  doctorName: string;
  metaPixelId: string | null;
  ga4MeasurementId: string | null;
}

function readUtmParams(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const p = new URLSearchParams(window.location.search);
  return {
    utm_source: p.get('utm_source') || '',
    utm_medium: p.get('utm_medium') || '',
    utm_campaign: p.get('utm_campaign') || '',
    utm_content: p.get('utm_content') || '',
    utm_term: p.get('utm_term') || '',
    gclid: p.get('gclid') || '',
    fbclid: p.get('fbclid') || '',
  };
}

function readCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

export function InscricaoClient({
  tenantSlug,
  doctorName,
  metaPixelId,
  ga4MeasurementId,
}: InscricaoClientProps) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fbReady, setFbReady] = useState(false);

  useEffect(() => {
    if (!metaPixelId || !fbReady) return;

    const eventId = crypto.randomUUID();
    const utm = readUtmParams();

    try {
      // @ts-expect-error fbq global
      window.fbq?.('init', metaPixelId);
      // @ts-expect-error fbq global
      window.fbq?.('track', 'PageView', {}, { eventID: eventId });
    } catch {
      /* pixel blocked */
    }

    fetch('/api/tracking/pageview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        tenant_slug: tenantSlug,
        event_id: eventId,
        event_source_url: window.location.href,
        ...utm,
        referrer: document.referrer || '',
        fbc: readCookie('_fbc'),
        gclid: utm.gclid,
      }),
    }).catch(() => {});
  }, [metaPixelId, fbReady, tenantSlug]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim();
    const email = (form.elements.namedItem('email') as HTMLInputElement).value.trim();
    const phone = (form.elements.namedItem('phone') as HTMLInputElement).value.trim();

    const eventId = crypto.randomUUID();
    const utm = readUtmParams();

    try {
      // @ts-expect-error fbq global
      window.fbq?.('track', 'Lead', {}, { eventID: eventId });
    } catch {
      /* */
    }

    try {
      const res = await fetch('/api/tracking/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_slug: tenantSlug,
          event_id: eventId,
          event_source_url: window.location.href,
          name,
          email,
          phone,
          ...utm,
          referrer: document.referrer || '',
          fbc: readCookie('_fbc'),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar');

      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Algo deu errado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {metaPixelId && (
        <>
          <Script
            id="fb-pixel"
            strategy="afterInteractive"
            src="https://connect.facebook.net/en_US/fbevents.js"
            onLoad={() => setFbReady(true)}
          />
        </>
      )}

      {ga4MeasurementId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4MeasurementId}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${ga4MeasurementId}');
            `}
          </Script>
        </>
      )}

      <main className="landing-main">
        <div className="landing-card">
          <div className="landing-wordmark">
            <span className="landing-dot" aria-hidden />
            Lente
          </div>

          <h1 className="landing-title">
            Inscreva-se <span className="landing-accent">agora</span>.
          </h1>
          <p className="landing-sub">
            Preencha seus dados para falar com {doctorName}.
          </p>

          {done ? (
            <div className="landing-success" role="status">
              <strong>Inscrição recebida.</strong> Em breve entraremos em contato.
            </div>
          ) : (
            <form className="landing-form" onSubmit={handleSubmit} noValidate>
              <input
                name="name"
                type="text"
                required
                placeholder="Seu nome completo"
                className="landing-input"
                autoComplete="name"
              />
              <input
                name="email"
                type="email"
                required
                placeholder="voce@email.com"
                className="landing-input"
                autoComplete="email"
              />
              <input
                name="phone"
                type="tel"
                required
                placeholder="(11) 99999-9999"
                className="landing-input"
                autoComplete="tel"
              />
              <button type="submit" className="landing-btn" disabled={loading}>
                {loading ? 'Enviando…' : 'Inscrever-se'}
              </button>
              <p className="landing-fine">Sem spam. Você pode cancelar a qualquer momento.</p>
              {error && (
                <p className="landing-error" role="alert">
                  {error}
                </p>
              )}
            </form>
          )}
        </div>
      </main>
    </>
  );
}
