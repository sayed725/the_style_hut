'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SellModal } from '@/components/sell/sell-modal';
import { money, variant } from '@/lib/format';
import { Search, ShoppingBag, Plus, X, Tag } from 'lucide-react';

export default function SellPage() {
  const [products, setProducts] = React.useState<any[]>([]);
  const [search, setSearch] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('all');
  const [selectedProduct, setSelectedProduct] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchProducts = () => {
    fetch('/api/products?all=1')
      .then((res) => res.json())
      .then((data) => {
        setProducts(Array.isArray(data) ? data : data?.products || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  React.useEffect(() => {
    fetchProducts();
  }, []);

  // Extract unique categories for filter pills
  const categories = React.useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category?.trim()) set.add(p.category.trim());
    });
    return ['all', ...Array.from(set)];
  }, [products]);

  const filtered = products.filter((p) => {
    if (p.quantity <= 0) return false;
    if (selectedCategory !== 'all' && p.category?.trim().toLowerCase() !== selectedCategory.toLowerCase()) {
      return false;
    }
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return [p.name, p.sku, p.category, p.size, p.color].join(' ').toLowerCase().includes(term);
  });

  const totalInStock = products.reduce((acc, p) => acc + (p.quantity || 0), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            Point of Sale
            <Badge variant="outline" className="text-xs font-semibold py-0.5">
              {totalInStock} pcs available
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Select an item below to register an instant customer sale and deduct inventory.
          </p>
        </div>
        <Link href="/inventory">
          <Button variant="outline" size="sm" className="self-start sm:self-auto font-medium">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Stock
          </Button>
        </Link>
      </div>

      {/* Search & Category Filter Toolbar */}
      <div className="space-y-3">
        {/* Search Input */}
        <div className="relative w-full max-w-lg">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="search"
            placeholder="Search by name, size, color, SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-9 h-11 text-sm sm:text-sm shadow-xs rounded-xl"
            autoFocus
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Category Pills (Horizontal scrolling on touch devices) */}
        {categories.length > 2 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none select-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all touch-manipulation capitalize ${
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {filtered.map((p) => {
            const isLowStock = p.quantity <= p.low_stock;
            return (
              <Card
                key={p.id}
                onClick={() => setSelectedProduct(p)}
                className="group p-4 cursor-pointer hover:border-teal-600 dark:hover:border-teal-500 hover:shadow-md transition-all duration-150 active:scale-[0.98] select-none flex flex-col justify-between rounded-xl relative overflow-hidden"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white line-clamp-1 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                      {p.name}
                    </h3>
                    <Badge variant={isLowStock ? 'warning' : 'success'} className="shrink-0 text-[11px] font-semibold">
                      {p.quantity} pcs
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
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
                      <span className="text-slate-400 text-xs">{p.category}</span>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  {p.selling_price > 0 ? (
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Price</span>
                      <span className="text-base font-extrabold text-teal-800 dark:text-teal-300 font-mono">
                        {money(p.selling_price)}
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Cost Price</span>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300 font-mono">
                        {money(p.purchase_price)}
                      </span>
                    </div>
                  )}
                  <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400 group-hover:bg-teal-50 dark:group-hover:bg-teal-950/50 px-2 py-1 rounded-md uppercase tracking-wider flex items-center gap-1 transition-colors">
                    <Tag className="h-3 w-3" />
                    {p.selling_price > 0 ? 'Sell Now' : 'Set Price & Sell'}
                  </span>
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
                setSelectedCategory('all');
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
        onSuccess={fetchProducts}
      />
    </div>
  );
}
