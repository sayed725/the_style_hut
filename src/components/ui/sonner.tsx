'use client';

import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

export function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      richColors
      closeButton
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-white group-[.toaster]:text-slate-900 group-[.toaster]:border-slate-200 group-[.toaster]:shadow-lg dark:group-[.toaster]:bg-slate-900 dark:group-[.toaster]:text-slate-100 dark:group-[.toaster]:border-slate-800 rounded-xl font-sans',
          description: 'group-[.toast]:text-slate-500 dark:group-[.toast]:text-slate-400 text-xs',
          actionButton:
            'group-[.toast]:bg-teal-700 group-[.toast]:text-white font-semibold text-xs',
          cancelButton:
            'group-[.toast]:bg-slate-100 group-[.toast]:text-slate-600 font-semibold text-xs',
        },
      }}
      {...props}
    />
  );
}
