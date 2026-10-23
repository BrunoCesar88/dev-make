'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';
  const authError = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    authError ? 'Falha na autenticação. Tente novamente.' : null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        if (signInError.message.toLowerCase().includes('fetch')) {
          setError(
            'Não foi possível conectar ao Supabase. Verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local e reinicie o servidor.'
          );
        } else {
          setError('Email ou senha incorretos');
        }
        setLoading(false);
        return;
      }

      router.push(next);
      router.refresh();
    } catch {
      setError(
        'Erro de conexão com o Supabase. Confira as chaves no .env.local e reinicie com npm run dev.'
      );
      setLoading(false);
    }
  };

  return (
    <div className="apple-card w-full max-w-md p-8 lg:p-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--brand-primary)] text-2xl font-bold text-[var(--brand-on-primary)] shadow-lg">
          L
        </div>
        <h1 className="text-[32px] font-semibold tracking-tight text-[var(--brand-text)]">
          Lente
        </h1>
        <p className="mt-1 text-[15px] text-[var(--brand-text-tertiary)]">Captura de Leads</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[var(--brand-text-tertiary)]">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="input-field py-3 text-[15px]"
            placeholder="seu@email.com"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[var(--brand-text-tertiary)]">
            Senha
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="input-field py-3 text-[15px]"
          />
        </div>

        {error && <p className="text-[14px] text-[#ff3b30]">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[var(--brand-primary)] py-3 text-[15px] font-medium text-[var(--brand-on-primary)] transition hover:bg-[var(--brand-primary-hover)] disabled:opacity-50"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
