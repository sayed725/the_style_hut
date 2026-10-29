'use client';

import Link from 'next/link';
import { Settings } from 'lucide-react';

interface MobileHeaderProps {
  username?: string;
}

export function MobileHeader({ username = 'Admin' }: MobileHeaderProps) {
  return (
    <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="flex flex-col">
        <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">Store Manager</span>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] text-slate-500 font-medium">{username}</span>
        </div>
      </div>
      <Link
        href="/settings"
        className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900"
      >
        <Settings className="h-4 w-4" />
      </Link>
    </header>
  );
}
