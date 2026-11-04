import type { QueryClient } from '@tanstack/react-query';
import { todayStr } from './format';

const prefetched = new Set<string>();

export function prefetchRouteData(href: string, queryClient: QueryClient) {
  if (typeof window === 'undefined' || !href) return;
  const now = Date.now();
  const cacheKey = `${href}_${Math.floor(now / 30000)}`;
  if (prefetched.has(cacheKey)) return;
  prefetched.add(cacheKey);

  const today = todayStr('Asia/Dhaka');

  switch (href) {
    case '/': {
      queryClient.prefetchQuery({
        queryKey: ['dashboard'],
        queryFn: async () => {
          const res = await fetch('/api/dashboard');
          if (!res.ok) throw new Error('Failed to prefetch dashboard');
          return res.json();
        },
        staleTime: 60 * 1000,
      });
      break;
    }
    case '/sell': {
      queryClient.prefetchQuery({
        queryKey: ['products', 'pos', { q: '', category: 'all', sort: 'newest' }],
        queryFn: async () => {
          const res = await fetch('/api/products?all=1&in_stock=1&sort=newest');
          if (!res.ok) throw new Error('Failed to prefetch POS');
          return res.json();
        },
        staleTime: 60 * 1000,
      });
      break;
    }
    case '/inventory': {
      queryClient.prefetchQuery({
        queryKey: ['products', { page: 1, search: '', category: 'all', sort: 'newest' }],
        queryFn: async () => {
          const res = await fetch('/api/products?page=1&limit=10&sort=newest');
          if (!res.ok) throw new Error('Failed to prefetch inventory');
          return res.json();
        },
        staleTime: 60 * 1000,
      });
      break;
    }
    case '/sales': {
      queryClient.prefetchQuery({
        queryKey: [
          'sales',
          {
            page: 1,
            from: today,
            to: today,
            search: '',
            preset: 'today',
            paymentMethod: 'all',
            category: 'all',
            sort: 'date_desc',
          },
        ],
        queryFn: async () => {
          const res = await fetch(
            `/api/sales?page=1&limit=10&from=${today}&to=${today}&preset=today&payment_method=all&category=all&sort=date_desc`
          );
          if (!res.ok) throw new Error('Failed to prefetch sales');
          return res.json();
        },
        staleTime: 60 * 1000,
      });
      break;
    }
    case '/reports': {
      queryClient.prefetchQuery({
        queryKey: ['report', today, today, 'day', 1, '', 'profit_desc'],
        queryFn: async () => {
          const res = await fetch(
            `/api/reports?from=${today}&to=${today}&group=day&page=1&limit=10&sort=profit_desc`
          );
          if (!res.ok) throw new Error('Failed to prefetch report');
          return res.json();
        },
        staleTime: 60 * 1000,
      });
      break;
    }
  }
}

