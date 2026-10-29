'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingCart, Package, ReceiptText, BarChart3, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/sell', label: 'Sell', icon: ShoppingCart },
  { href: '/inventory', label: 'Stock', icon: Package },
  { href: '/sales', label: 'Sales', icon: ReceiptText },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] shadow-lg flex items-center justify-around">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center flex-1 min-w-0 py-1.5 px-1 rounded-lg text-[10px] font-semibold transition-all touch-manipulation',
              isActive
                ? 'text-teal-700 dark:text-teal-400 font-bold bg-teal-50 dark:bg-teal-950/50'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            <Icon className={cn('h-5 w-5 mb-0.5', isActive ? 'text-teal-700 dark:text-teal-400 scale-105' : 'text-slate-400')} />
            <span className="truncate max-w-full">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
