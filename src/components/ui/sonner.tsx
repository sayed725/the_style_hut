'use client';

import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

export function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      position="top-right"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'group toast flex items-start gap-3 w-full rounded-2xl p-4 shadow-xl border font-sans select-none !bg-[#090d16] !text-white !border-slate-800',
          title: 'text-sm font-bold tracking-tight !text-white',
          description: 'text-xs mt-1 leading-relaxed !text-slate-200',
          actionButton:
            'bg-teal-700 text-white font-semibold text-xs rounded-lg px-3 py-1.5',
          cancelButton:
            'bg-slate-800 text-slate-300 font-semibold text-xs rounded-lg px-3 py-1.5',
          closeButton:
            '!bg-transparent hover:!bg-white/10 !border-none !text-white !opacity-70 hover:!opacity-100 transition-opacity',
          success:
            '!bg-[#090d16] !border-emerald-500/70 !text-white shadow-emerald-500/10',
          error:
            '!bg-[#090d16] !border-rose-500/70 !text-white shadow-rose-500/10',
          warning:
            '!bg-[#090d16] !border-amber-500/70 !text-white shadow-amber-500/10',
          info:
            '!bg-[#090d16] !border-slate-800 !text-white shadow-slate-900/5',
        },
      }}
      {...props}
    />
  );
}
