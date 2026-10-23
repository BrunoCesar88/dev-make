'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';
import type { Theme } from '@/lib/theme';

const options: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
];

interface ThemeToggleProps {
  compact?: boolean;
  showLabel?: boolean;
}

export function ThemeToggle({ compact = false, showLabel = true }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  const control = (
    <div
      className={cn(
        'inline-flex rounded-lg border border-[var(--brand-border)] bg-[var(--brand-muted-surface)] p-1',
        compact ? 'w-full' : ''
      )}
    >
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition',
            compact ? 'flex-1' : '',
            theme === value
              ? 'bg-[var(--brand-surface)] text-[var(--brand-text)] shadow-sm'
              : 'text-[var(--brand-text-tertiary)] hover:text-[var(--brand-text)]'
          )}
          title={label}
          aria-label={label}
          aria-pressed={theme === value}
        >
          <Icon className="h-3.5 w-3.5" />
          {(!compact || showLabel) && label}
        </button>
      ))}
    </div>
  );

  if (compact) {
    return (
      <div className="w-full">
        <p className="mb-2 text-[11px] font-medium text-[var(--brand-text-tertiary)]">
          Tema
        </p>
        {control}
      </div>
    );
  }

  return control;
}
