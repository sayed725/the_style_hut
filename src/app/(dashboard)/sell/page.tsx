'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SellModal } from '@/components/sell/sell-modal';
import { money, num } from '@/lib/format';
import { Search, ShoppingBag, Plus, X, ArrowUpDown, ChevronDown } from 'lucide-react';

export default function SellPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('all');
  const [sort, setSort] = React.useState('newest');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedProduct, setSelectedProduct] = React.useState<any>(null);

  // Debounce search input for backend queries
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading: loading } = useQuery({
    queryKey: ['products', 'pos', { q: debouncedSearch.trim(), category: selectedCategory, sort }],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        all: '1',
        in_stock: '1',
        sort,
      });
      if (debouncedSearch.trim()) {
        params.set('q', debouncedSearch.trim());
      }
      if (selectedCategory && selectedCategory !== 'all') {
        params.set('category', selectedCategory);
      }

      const res = await fetch(`/api/products?${params.toString()}`, { signal });
      if (!res.ok) throw new Error('Failed to fetch products');
      return res.json();
    },
    staleTime: 15 * 1000,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const products: any[] = React.useMemo(() => {
    let list: any[] = [];
    if (data && Array.isArray(data.products)) {
      list = [...data.products];
    } else if (Array.isArray(data)) {
      list = [...data];
    } else {
      return [];
    }

    const getEffectivePrice = (p: any): number => {
      const sp = parseFloat(String(p.selling_price)) || 0;
      if (sp > 0) return sp;
      return parseFloat(String(p.purchase_price)) || 0;
    };

    if (sort === 'price_high') {
      list.sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a) || (Number(b.id) || 0) - (Number(a.id) || 0));
    } else if (sort === 'price_low') {
      list.sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b) || (Number(b.id) || 0) - (Number(a.id) || 0));
    } else if (sort === 'stock_high') {
      list.sort((a, b) => (Number(b.quantity) || 0) - (Number(a.quantity) || 0) || (Number(b.id) || 0) - (Number(a.id) || 0));
    } else if (sort === 'stock_low') {
      list.sort((a, b) => (Number(a.quantity) || 0) - (Number(b.quantity) || 0) || (Number(b.id) || 0) - (Number(a.id) || 0));
    } else if (sort === 'oldest') {
      list.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
    } else if (sort === 'newest') {
      list.sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
    }

    return list;
  }, [data, sort]);

  const categories: string[] = React.useMemo(() => {
    if (data && Array.isArray(data.categories)) return ['all', ...data.categories];
    return ['all'];
  }, [data]);

  const categoriesCount: number =
    data?.overallCategoriesCount ||
    data?.categories?.length ||
    (categories.length > 1 ? categories.length - 1 : 0);

  const totalInStock: number =
    data?.overallTotalPieces ||
    data?.totalPieces ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    products.reduce((acc: number, p: any) => acc + (p.quantity || 0), 0);

  const handleSaleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['sales'] });
    queryClient.invalidateQueries({ queryKey: ['report'] });
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 min-w-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white truncate">
            Point of Sale
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5 truncate">
            <span className="text-teal-600 dark:text-teal-400 font-bold">{categoriesCount}</span>{' '}
            {categoriesCount === 1 ? 'category' : 'categories'} •{' '}
            <span className="text-teal-600 dark:text-teal-400 font-bold">{num(totalInStock)}</span>{' '}
            total pieces in stock
          </p>
        </div>
        <Link href="/inventory" className="shrink-0">
          <Button
            variant="primary"
            className="font-bold shadow-md h-9 w-9 p-0 sm:h-10 sm:w-auto sm:px-4 shrink-0"
            title="Add Stock"
            aria-label="Add Stock"
          >
            <Plus className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Add Stock</span>
          </Button>
        </Link>
      </div>

      {/* Search, Sort & Category Filter Toolbar */}
      <div className="space-y-2.5 sm:space-y-3">
        <div className="flex items-center gap-2 w-full">
          {/* Search Input */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400 pointer-events-none" />
            <Input
              type="search"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 sm:pl-9 pr-8 h-10 sm:h-11 text-xs sm:text-sm shadow-xs rounded-xl truncate"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setDebouncedSearch('');
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative shrink-0 w-[116px] sm:w-auto">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sort products"
              className="w-full h-10 sm:h-11 pl-6 sm:pl-8 pr-5 sm:pr-7 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer appearance-none shadow-xs truncate"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="stock_high">Stock High</option>
              <option value="stock_low">Stock Low</option>
              <option value="price_high">Price High</option>
              <option value="price_low">Price Low</option>
            </select>
            <ArrowUpDown className="absolute left-2 sm:left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-400 pointer-events-none" />
            <ChevronDown className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Category Pills (Horizontal scrolling on touch devices) */}
        {categories.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none select-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all touch-manipulation capitalize cursor-pointer ${
                  selectedCategory.toLowerCase() === cat.toLowerCase()
                    ? 'bg-teal-700 text-white dark:bg-teal-600 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                }`}
              >
                {cat === 'all' ? 'All Items' : cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-18 sm:h-20 rounded-xl bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
          {products.map((p) => {
            const isLowStock = p.quantity <= p.low_stock;
            const displayPrice = Number(p.selling_price) > 0 ? Number(p.selling_price) : Number(p.purchase_price) || 0;

            return (
              <Card
                key={p.id}
                onClick={() => setSelectedProduct(p)}
                className="group p-3 sm:p-3.5 cursor-pointer hover:border-teal-600 dark:hover:border-teal-500 hover:shadow-md transition-all duration-150 active:scale-[0.98] select-none rounded-xl flex items-center justify-between gap-3 relative overflow-hidden"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                    {p.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mt-1">
                    {p.size && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium text-[11px]">
                        Size: {p.size}
                      </span>
                    )}
                    {p.color && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium text-[11px]">
                        Color: {p.color}
                      </span>
                    )}
                    {p.category && !p.size && !p.color && (
                      <span className="text-slate-400 text-xs truncate">{p.category}</span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                  <span className="text-base sm:text-lg font-extrabold text-teal-800 dark:text-teal-300 font-mono">
                    {money(displayPrice)}
                  </span>
                  <Badge variant={isLowStock ? 'warning' : 'success'} className="shrink-0 text-[11px] font-semibold">
                    {p.quantity} pcs
                  </Badge>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-xs">
          <ShoppingBag className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No matching products</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            {search || selectedCategory !== 'all'
              ? 'Try adjusting your search terms or filter category.'
              : 'Add products with available stock in the inventory page to start selling.'}
          </p>
          {(search || selectedCategory !== 'all') ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch('');
                setDebouncedSearch('');
                setSelectedCategory('all');
                setSort('newest');
              }}
            >
              Reset Filters
            </Button>
          ) : (
            <Link href="/inventory">
              <Button variant="primary">
                <Plus className="h-4 w-4 mr-1.5" />
                Add Products
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Cashier Sell Modal */}
      <SellModal
        product={selectedProduct}
        open={!!selectedProduct}
        onOpenChange={(open) => !open && setSelectedProduct(null)}
        onSuccess={handleSaleSuccess}
      />
    </div>
  );
}
