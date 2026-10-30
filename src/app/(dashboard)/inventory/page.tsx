'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { ProductModal } from '@/components/stock/product-modal';
import { RestockModal } from '@/components/stock/restock-modal';
import { SellModal } from '@/components/sell/sell-modal';
import { money, num, variant } from '@/lib/format';
import { Plus, Search, Package, Edit, Trash2, ShoppingCart, MoreVertical, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export default function InventoryPage() {
  const [products, setProducts] = React.useState<any[]>([]);
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalPieces, setTotalPieces] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  // Modals state
  const [productModalOpen, setProductModalOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<any>(null);
  const [restockProduct, setRestockProduct] = React.useState<any>(null);
  const [sellProduct, setSellProduct] = React.useState<any>(null);

  // 3-dot menu state
  const [activeMenu, setActiveMenu] = React.useState<{ product: any; top: number; right: number } | null>(null);

  // Remove confirmation modal state
  const [removingProduct, setRemovingProduct] = React.useState<any>(null);
  const [removeLoading, setRemoveLoading] = React.useState(false);

  // Debounce search input and reset to page 1
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Memoize pagination items to prevent large array generation and handle any number of pages safely
  const paginationItems = React.useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const items: (number | string)[] = [1];
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);

    if (start > 2) items.push('...');
    for (let i = start; i <= end; i++) items.push(i);
    if (end < totalPages - 1) items.push('...');

    items.push(totalPages);
    return items;
  }, [page, totalPages]);

  React.useEffect(() => {
    if (!activeMenu) return;
    const close = () => setActiveMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveMenu(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('keydown', handleKey);
    };
  }, [activeMenu]);

  const handleOpenMenu = (e: React.MouseEvent<HTMLButtonElement>, product: any) => {
    e.stopPropagation();
    if (activeMenu?.product.id === product.id) {
      setActiveMenu(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      setActiveMenu({
        product,
        top: rect.bottom + 6,
        right: Math.max(8, window.innerWidth - rect.right),
      });
    }
  };

  const fetchProducts = React.useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: '10',
    });
    if (debouncedSearch.trim()) {
      params.set('q', debouncedSearch.trim());
    }

    fetch(`/api/products?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.products)) {
          setProducts(data.products);
          setTotal(data.total || 0);
          setTotalPages(data.totalPages || 1);
          setTotalPieces(data.totalPieces || 0);
        } else if (Array.isArray(data)) {
          setProducts(data);
          setTotal(data.length);
          setTotalPages(Math.max(1, Math.ceil(data.length / 10)));
          setTotalPieces(data.reduce((acc: number, p: any) => acc + (p.quantity || 0), 0));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page, debouncedSearch]);

  React.useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const confirmRemove = async () => {
    if (!removingProduct) return;
    setRemoveLoading(true);
    try {
      const res = await fetch(`/api/products/${removingProduct.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to remove product');
      }
      toast.success(`"${removingProduct.name}" removed / archived.`);
      setRemovingProduct(null);
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove product');
    } finally {
      setRemoveLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-3 min-w-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white truncate">
            Stock Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5 truncate">
            {total} {total === 1 ? 'product' : 'products'} • {num(totalPieces)} total pieces on hand
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setEditingProduct(null);
            setProductModalOpen(true);
          }}
          className="font-bold shadow-md h-9 w-9 p-0 sm:h-10 sm:w-auto sm:px-4 shrink-0"
          title="Add Product"
          aria-label="Add Product"
        >
          <Plus className="h-4 w-4 sm:mr-1.5" />
          <span className="hidden sm:inline">Add Product</span>
        </Button>
      </div>

      {/* Search Bar */}
      <div className="max-w-md w-full">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="search"
            placeholder="Search by name, SKU, category, size..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 shadow-xs rounded-xl"
          />
        </div>
      </div>

      {/* Desktop Table View (>= md screens) */}
      <Card className="hidden md:block overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800 font-semibold select-none">
              <tr>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4 whitespace-nowrap">Stock</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Cost</th>
                <th className="py-3 px-4 text-right whitespace-nowrap w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse border-b border-slate-100 dark:border-slate-800">
                    <td className="py-3.5 px-4">
                      <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded mb-1.5" />
                      <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800/60 rounded" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded-full" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="h-4 w-14 bg-slate-200 dark:bg-slate-800 rounded ml-auto" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-lg ml-auto" />
                    </td>
                  </tr>
                ))
              ) : products.length > 0 ? (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 max-w-[200px] lg:max-w-sm">
                      <div className="font-bold text-slate-900 dark:text-white truncate" title={p.name}>
                        {p.name}
                      </div>
                      <div
                        className="text-[11px] text-slate-400 mt-0.5 truncate"
                        title={[p.category, p.sku].filter(Boolean).join(' • ') || undefined}
                      >
                        {[p.category, p.sku].filter(Boolean).join(' • ') || '—'}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <Badge
                        variant={p.quantity === 0 ? 'destructive' : p.quantity <= p.low_stock ? 'warning' : 'success'}
                        className="whitespace-nowrap"
                      >
                        {p.quantity === 0 ? 'Out of stock' : `${num(p.quantity)} in stock`}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-600 dark:text-slate-300 font-mono whitespace-nowrap">
                      {money(p.purchase_price)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap w-16">
                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          onClick={(e) => handleOpenMenu(e, p)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Actions menu"
                          aria-label="Actions menu"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center py-16 text-slate-400">
                    <Package className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    {search ? 'No products match your search query.' : 'No products found. Click "Add Product" to add your first item.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mobile Card Stack View (< md screens) */}
      <div className="block md:hidden space-y-2">
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="p-3 rounded-xl shadow-xs animate-pulse border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="h-3.5 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-2.5 w-16 bg-slate-100 dark:bg-slate-800/60 rounded" />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="h-4 w-12 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-5 w-14 bg-slate-200 dark:bg-slate-800 rounded-full" />
                  <div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                </div>
              </Card>
            ))}
          </div>
        ) : products.length > 0 ? (
          products.map((p) => (
            <Card key={p.id} className="p-3 rounded-xl shadow-xs flex items-center justify-between gap-2.5 sm:gap-3 min-w-0">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white truncate" title={p.name}>
                  {p.name}
                </h3>
                <p
                  className="text-[11px] text-slate-400 truncate mt-0.5"
                  title={[p.category, p.sku].filter(Boolean).join(' • ') || undefined}
                >
                  {[p.category, p.sku].filter(Boolean).join(' • ') || 'Standard'}
                </p>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <span className="font-bold text-slate-800 dark:text-slate-200 font-mono text-xs sm:text-sm whitespace-nowrap">
                  {money(p.purchase_price)}
                </span>
                <Badge
                  variant={p.quantity === 0 ? 'destructive' : p.quantity <= p.low_stock ? 'warning' : 'success'}
                  className="whitespace-nowrap"
                >
                  {p.quantity === 0 ? 'Out' : `${num(p.quantity)} pcs`}
                </Badge>
                <button
                  type="button"
                  onClick={(e) => handleOpenMenu(e, p)}
                  className="w-8 h-8 -mr-1 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                  title="Actions menu"
                  aria-label="Actions menu"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-8 text-center text-slate-400">
            <Package className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            <p className="text-xs">
              {search ? 'No products match your search query.' : 'No products found matching your search.'}
            </p>
          </Card>
        )}
      </div>

      {/* Backend Pagination Bar (Visible only if more than 10 products exist) */}
      {total > 10 && (
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 pt-3 text-xs text-slate-500 font-medium max-w-full">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="h-8 px-2 sm:px-2.5 text-xs font-semibold gap-1 shrink-0"
            title="Previous page"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Previous</span>
          </Button>

          {/* Mobile compact page indicator (fits any device width and never overflows or wraps) */}
          <div className="flex sm:hidden items-center px-2 text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
            Page <b className="text-slate-900 dark:text-white font-mono mx-1">{page}</b> of{' '}
            <b className="text-slate-900 dark:text-white font-mono ml-1">{totalPages}</b>
          </div>

          {/* Desktop numbered page pills */}
          <div className="hidden sm:flex items-center gap-1">
            {paginationItems.map((p, idx) =>
              typeof p === 'string' ? (
                <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 select-none">
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  disabled={loading}
                  className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    page === p
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {p}
                </button>
              )
            )}
          </div>

          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="h-8 px-2 sm:px-2.5 text-xs font-semibold gap-1 shrink-0"
            title="Next page"
            aria-label="Next page"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      <ProductModal
        product={editingProduct}
        open={productModalOpen}
        onOpenChange={setProductModalOpen}
        onSuccess={fetchProducts}
      />

      {/* Restock Modal */}
      <RestockModal
        product={restockProduct}
        open={!!restockProduct}
        onOpenChange={(open) => !open && setRestockProduct(null)}
        onSuccess={fetchProducts}
      />

      {/* Quick Sell Modal */}
      <SellModal
        product={sellProduct}
        open={!!sellProduct}
        onOpenChange={(open) => !open && setSellProduct(null)}
        onSuccess={fetchProducts}
      />

      {/* 3-Dot Floating Context Menu */}
      {activeMenu && (
        <div
          style={{ top: `${activeMenu.top}px`, right: `${activeMenu.right}px` }}
          className="fixed z-50 min-w-[175px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1 text-xs animate-in fade-in zoom-in-95 duration-100 select-none"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            disabled={activeMenu.product.quantity <= 0}
            onClick={() => {
              const prod = activeMenu.product;
              setActiveMenu(null);
              setSellProduct(prod);
            }}
            className="w-full px-3 py-2 flex items-center gap-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            <ShoppingCart className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            Sell Product
          </button>
          <button
            type="button"
            onClick={() => {
              const prod = activeMenu.product;
              setActiveMenu(null);
              setRestockProduct(prod);
            }}
            className="w-full px-3 py-2 flex items-center gap-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium cursor-pointer"
          >
            <Package className="h-4 w-4 text-slate-500" />
            Restock Inventory
          </button>
          <button
            type="button"
            onClick={() => {
              const prod = activeMenu.product;
              setActiveMenu(null);
              setEditingProduct(prod);
              setProductModalOpen(true);
            }}
            className="w-full px-3 py-2 flex items-center gap-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium cursor-pointer"
          >
            <Edit className="h-4 w-4 text-slate-500" />
            Edit Details
          </button>
          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
          <button
            type="button"
            onClick={() => {
              const prod = activeMenu.product;
              setActiveMenu(null);
              setRemovingProduct(prod);
            }}
            className="w-full px-3 py-2 flex items-center gap-2 text-left text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-medium cursor-pointer"
          >
            <Trash2 className="h-4 w-4 text-rose-500" />
            Remove Product
          </button>
        </div>
      )}

      {/* Remove Confirmation Dialog */}
      <Dialog open={!!removingProduct} onOpenChange={(open) => !open && setRemovingProduct(null)}>
        {removingProduct && (
          <div>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle>Confirm Removal</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to remove this product?
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <DialogBody className="space-y-3.5">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Product Name:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{removingProduct.name}</span>
                </div>
                {removingProduct.category && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Category:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{removingProduct.category}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Stock:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{removingProduct.quantity} pcs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cost Price:</span>
                  <span className="font-semibold text-slate-900 dark:text-white font-mono">{money(removingProduct.purchase_price)}</span>
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                If this product has recorded sales, it will be <b>safely archived</b> to preserve all previous sales and profit reports. If it has no sales, it will be deleted permanently.
              </p>
            </DialogBody>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRemovingProduct(null)}
                disabled={removeLoading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={confirmRemove}
                disabled={removeLoading}
              >
                {removeLoading ? 'Removing...' : 'Yes, Remove Product'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>
    </div>
  );
}
