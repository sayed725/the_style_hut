import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'outline';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none',
        {
          'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100': variant === 'default',
          'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800':
            variant === 'success',
          'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800':
            variant === 'warning',
          'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800':
            variant === 'destructive',
          'border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300':
            variant === 'outline',
        },
        className
      )}
      {...props}
    />
  );
}
