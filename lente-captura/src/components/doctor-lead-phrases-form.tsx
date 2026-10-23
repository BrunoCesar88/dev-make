'use client';

import { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { DEFAULT_MANYCHAT_TRIGGERS } from '@/lib/leads/manychat-triggers';

interface DoctorLeadPhrasesFormProps {
  doctorId: string;
  readOnly?: boolean;
}

function ensureAtLeastOne(values: string[]): string[] {
  return values.length > 0 ? values : [''];
}

export function DoctorLeadPhrasesForm({
  doctorId,
  readOnly = false,
}: DoctorLeadPhrasesFormProps) {
  const [bioPhrases, setBioPhrases] = useState<string[]>(['']);
  const [sitePhrases, setSitePhrases] = useState<string[]>(['']);
  const [manychatPhrases, setManychatPhrases] = useState<string[]>(['']);
  const [socialSellingPhrases, setSocialSellingPhrases] = useState<string[]>(['']);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/doctors/${doctorId}/lead-phrases`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setMessage(data.error);
          return;
        }
        setBioPhrases(ensureAtLeastOne(data.bio_phrases || []));
        setSitePhrases(ensureAtLeastOne(data.site_phrases || []));
        setManychatPhrases(ensureAtLeastOne(data.manychat_phrases || []));
        setSocialSellingPhrases(ensureAtLeastOne(data.social_selling_phrases || []));
      })
      .catch(() => setMessage('Erro ao carregar frases'))
      .finally(() => setLoading(false));
  }, [doctorId]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/doctors/${doctorId}/lead-phrases`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bio_phrases: bioPhrases,
          site_phrases: sitePhrases,
          manychat_phrases: manychatPhrases,
          social_selling_phrases: socialSellingPhrases,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || 'Erro ao salvar');
        return;
      }
      setBioPhrases(ensureAtLeastOne(data.bio_phrases || []));
      setSitePhrases(ensureAtLeastOne(data.site_phrases || []));
      setManychatPhrases(ensureAtLeastOne(data.manychat_phrases || []));
      setSocialSellingPhrases(ensureAtLeastOne(data.social_selling_phrases || []));
      setMessage('Frases salvas.');
    } catch {
      setMessage('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="apple-card p-6 lg:p-8">
        <p className="text-[14px] text-[var(--brand-text-tertiary)]">Carregando frases…</p>
      </section>
    );
  }

  return (
    <section className="apple-card p-6 lg:p-8">
      <div className="mb-4">
        <h2 className="text-[21px] font-semibold text-[var(--brand-text)]">
          Frases de captura (WhatsApp)
        </h2>
        <p className="mt-1 text-[13px] text-[var(--brand-text-tertiary)]">
          Mesma lógica da automação n8n: só entra no sistema se bater Meta Ads, bio, site,
          Manychat ou social selling. Adicione variações quando o texto do lead mudar.
        </p>
      </div>

      <div className="space-y-6">
        <PhraseVariationsField
          label="Frase Bio → origem LINK DA BIO"
          values={bioPhrases}
          onChange={setBioPhrases}
          readOnly={readOnly}
          multiline
        />

        <PhraseVariationsField
          label="Frase Site → origem GOOGLE"
          values={sitePhrases}
          onChange={setSitePhrases}
          readOnly={readOnly}
          multiline
        />

        <PhraseVariationsField
          label="Prefixo Manychat (extra além dos gatilhos globais)"
          values={manychatPhrases}
          onChange={setManychatPhrases}
          readOnly={readOnly}
          hint={`Globais: ${DEFAULT_MANYCHAT_TRIGGERS.join(' · ')}`}
        />

        <PhraseVariationsField
          label="Social Selling"
          values={socialSellingPhrases}
          onChange={setSocialSellingPhrases}
          readOnly={readOnly}
          multiline
        />
      </div>

      {!readOnly && (
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[var(--brand-text)] px-4 py-2 text-[13px] font-medium text-white disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Salvando…' : 'Salvar frases'}
        </button>
      )}

      {message && (
        <p className="mt-3 text-[13px] text-[var(--brand-text-secondary)]">{message}</p>
      )}
    </section>
  );
}

function PhraseVariationsField({
  label,
  values,
  onChange,
  readOnly,
  multiline = false,
  hint,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  readOnly: boolean;
  multiline?: boolean;
  hint?: string;
}) {
  const updateValue = (index: number, value: string) => {
    const next = [...values];
    next[index] = value;
    onChange(next);
  };

  const addVariation = () => {
    onChange([...values, '']);
  };

  const removeVariation = (index: number) => {
    if (values.length <= 1) {
      onChange(['']);
      return;
    }
    onChange(values.filter((_, i) => i !== index));
  };

  const inputClass =
    'w-full rounded-lg border border-[var(--brand-border)] px-3 py-2 text-[13px]';

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[12px] text-[var(--brand-text-tertiary)]">{label}</span>
        {!readOnly && (
          <button
            type="button"
            onClick={addVariation}
            className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--brand-primary)] transition hover:opacity-80"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar variação
          </button>
        )}
      </div>

      <div className="space-y-2">
        {values.map((value, index) => (
          <div key={index} className="flex items-start gap-2">
            <div className="flex-1">
              {multiline ? (
                <textarea
                  value={value}
                  onChange={(e) => updateValue(index, e.target.value)}
                  readOnly={readOnly}
                  rows={2}
                  placeholder={`Variação ${index + 1}`}
                  className={inputClass}
                />
              ) : (
                <input
                  value={value}
                  onChange={(e) => updateValue(index, e.target.value)}
                  readOnly={readOnly}
                  placeholder={`Variação ${index + 1}`}
                  className={inputClass}
                />
              )}
            </div>
            {!readOnly && values.length > 1 && (
              <button
                type="button"
                onClick={() => removeVariation(index)}
                className="mt-1 rounded-lg p-2 text-[var(--brand-text-tertiary)] transition hover:bg-[var(--brand-bg)] hover:text-[#ff3b30]"
                aria-label={`Remover variação ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {hint && (
        <p className="mt-1 text-[11px] text-[var(--brand-text-tertiary)]">{hint}</p>
      )}
    </div>
  );
}
