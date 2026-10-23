import { Suspense } from 'react';
import { LoginForm } from '@/components/login-form';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[var(--brand-primary-soft)] via-[var(--brand-bg)] to-[var(--brand-surface)] px-4">
      <Suspense fallback={<div className="text-[15px] text-[var(--brand-text-tertiary)]">Carregando...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
